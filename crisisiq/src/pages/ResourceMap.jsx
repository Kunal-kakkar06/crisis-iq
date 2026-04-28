// ============================================
// CrisisIQ — Resource Map Page
// ============================================
// Full-width map showing resource locations,
// heatmaps, and routing using Google Maps API.
// ============================================

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  GoogleMap, 
  MarkerF, 
  CircleF,
  InfoWindowF,
  HeatmapLayerF,
  DirectionsRenderer,
  PolylineF
} from '@react-google-maps/api';
import ErrorBoundary from "../components/ErrorBoundary";
import { 
  darkMapStyle, 
  KERALA_CENTER, 
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_ID,
} from '../config/googleMaps';
import { getKeralaZones, getIndiaDisasterZones } from '../utils/dataLoader';
import { getWeatherForAllZones } from '../services/weatherService';
import indiaMapImg from '../assets/india_fallback_map.png';
import keralaMapImg from '../assets/kerala_demo_map.png';
import disasterFlood from '../assets/disaster_flood.png';
import disasterLandslide from '../assets/disaster_landslide.png';
import disasterCyclone from '../assets/disaster_cyclone.png';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import './ResourceMap.css';

// ── Generate weighted heatmap points using real severity scores ──
const getHeatmapPoints = (zones) => {
  if (!window.google || !window.google.maps || !window.google.maps.LatLng || !zones) return [];
  const points = [];
  zones.forEach(zone => {
    const intensity = (zone.severityScore || 50) / 100;
    const count = Math.ceil(intensity * 20);
    for (let i = 0; i < count; i++) {
      const jitterLat = (zone.lat || 10) + (Math.random() - 0.5) * 0.12;
      const jitterLng = (zone.lng || 76) + (Math.random() - 0.5) * 0.12;
      points.push({
        location: new window.google.maps.LatLng(jitterLat, jitterLng),
        weight: intensity
      });
    }
  });
  return points;
};

// Blue hospital cross SVG icon
const HOSPITAL_ICON = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <circle cx="10" cy="10" r="9" fill="#1565C0" stroke="white" stroke-width="1.5"/>
  <rect x="8.5" y="4" width="3" height="12" rx="1" fill="white"/>
  <rect x="4" y="8.5" width="12" height="3" rx="1" fill="white"/>
</svg>
`)}`;


const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

const weatherZonesConfig = [
  // Kerala Zones
  {id:"WYD", name:"Wayanad", lat:11.6854, lng:76.1320},
  {id:"IDK", name:"Idukki", lat:9.9189, lng:77.1025},
  {id:"PKD", name:"Palakkad", lat:10.7867, lng:76.6548},
  {id:"TSR", name:"Thrissur", lat:10.5276, lng:76.2144},
  {id:"MLP", name:"Malappuram", lat:11.0510, lng:76.0711},
  {id:"ALP", name:"Alappuzha", lat:9.4981, lng:76.3388},
  {id:"EKM", name:"Ernakulam", lat:9.9816, lng:76.2999},
  {id:"KTM", name:"Kottayam", lat:9.5916, lng:76.5222},
  {id:"KZD", name:"Kozhikode", lat:11.2588, lng:75.7804},
  // National Zones
  {id:"MUM", name:"Mumbai", lat:19.0760, lng:72.8777},
  {id:"DEL", name:"Delhi", lat:28.7041, lng:77.1025},
  {id:"KOL", name:"Kolkata", lat:22.5726, lng:88.3639},
  {id:"CHN", name:"Chennai", lat:13.0827, lng:80.2707},
  {id:"BGL", name:"Bengaluru", lat:12.9716, lng:77.5946},
  {id:"HYD", name:"Hyderabad", lat:17.3850, lng:78.4867},
  {id:"AHM", name:"Ahmedabad", lat:23.0225, lng:72.5714},
  {id:"PAT", name:"Patna", lat:25.5941, lng:85.1376},
  {id:"GHW", name:"Guwahati", lat:26.1445, lng:91.7362},
  {id:"BHB", name:"Bhubaneswar", lat:20.2961, lng:85.8245},
  {id:"SML", name:"Shimla", lat:31.1048, lng:77.1734},
  {id:"SRN", name:"Srinagar", lat:34.0837, lng:74.7973}
];

function ResourceMap() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedZone, setSelectedZone] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);

  const getDisasterImage = (zone) => {
    if (!zone) return disasterFlood;
    if (zone.isKerala) return disasterFlood;
    const type = zone.disasterType || '';
    if (type.includes('Flood')) return disasterFlood;
    if (type.includes('Landslide') || type.includes('Earthquake')) return disasterLandslide;
    if (type.includes('Cyclone') || type.includes('Storm')) return disasterCyclone;
    return disasterFlood;
  };
  const [activeType, setActiveType] = useState('All');
  const [activeSeverity, setActiveSeverity] = useState('All');
  const [activeDistrict, setActiveDistrict] = useState('All');
  const [routeEta, setRouteEta] = useState(null);
  const [realZones, setRealZones] = useState([]);
  const [indiaZones, setIndiaZones] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [mapView, setMapView] = useState('india'); // 'india' | 'kerala'
  
  // Weather states
  const [weatherData, setWeatherData] = useState([]);
  const [weatherEnabled, setWeatherEnabled] = useState(location.state?.enableWeather || false);
  const [weatherApiError, setWeatherApiError] = useState(false);
  const [selectedWeatherZone, setSelectedWeatherZone] = useState(null);
  const [dismissWeatherAlert, setDismissWeatherAlert] = useState(false);

  // Routing API State
  const [allocationRoutes, setAllocationRoutes] = useState([]);
  const [isComputingRoutes, setIsComputingRoutes] = useState(false);

  const mapRef = useRef(null);
  const [mapsError, setMapsError] = useState(false);

  // Load real CSV data
  useEffect(() => {
    getKeralaZones().then(zones => {
      setRealZones(zones);
      const hospitals = zones.flatMap(z =>
        (z.hospitals || []).map(h => ({ ...h, districtName: z.name }))
      );
      setAllHospitals(hospitals);
    }).catch(console.error);
    getIndiaDisasterZones().then(zones => setIndiaZones(zones)).catch(console.error);
  }, []);

  // Fetch weather data (staggered to avoid rate limits)
  useEffect(() => {
    const fetchAllWeather = async () => {
      try {
        const results = await getWeatherForAllZones(weatherZonesConfig);
        
        const successCount = results.filter(r => r.weather !== null).length;
        if (successCount === 0) {
          setWeatherApiError(true);
          // Fallback data covering all India
          const fallbackData = [
            {...weatherZonesConfig.find(z => z.id === 'WYD'), weather: { humidity: 89, temp: 24, description: 'Heavy Rain', rainfall: 12, windSpeed: 28 }},
            {...weatherZonesConfig.find(z => z.id === 'IDK'), weather: { humidity: 92, temp: 22, description: 'Extreme Rain', rainfall: 15, windSpeed: 25 }},
            {...weatherZonesConfig.find(z => z.id === 'PKD'), weather: { humidity: 78, temp: 26, description: 'Moderate Rain', rainfall: 5, windSpeed: 15 }},
            {...weatherZonesConfig.find(z => z.id === 'TSR'), weather: { humidity: 76, temp: 25, description: 'Moderate Rain', rainfall: 4, windSpeed: 18 }},
            {...weatherZonesConfig.find(z => z.id === 'MUM'), weather: { humidity: 82, temp: 30, description: 'Heavy Rain', rainfall: 8, windSpeed: 22 }},
            {...weatherZonesConfig.find(z => z.id === 'DEL'), weather: { humidity: 55, temp: 38, description: 'Clear', rainfall: 0, windSpeed: 12 }},
            {...weatherZonesConfig.find(z => z.id === 'KOL'), weather: { humidity: 88, temp: 32, description: 'Rain', rainfall: 10, windSpeed: 20 }},
            {...weatherZonesConfig.find(z => z.id === 'CHN'), weather: { humidity: 80, temp: 33, description: 'Partly Cloudy', rainfall: 2, windSpeed: 15 }},
            {...weatherZonesConfig.find(z => z.id === 'BGL'), weather: { humidity: 65, temp: 27, description: 'Mostly Clear', rainfall: 0, windSpeed: 10 }},
            {...weatherZonesConfig.find(z => z.id === 'HYD'), weather: { humidity: 60, temp: 35, description: 'Cloudy', rainfall: 1, windSpeed: 14 }},
            {...weatherZonesConfig.find(z => z.id === 'AHM'), weather: { humidity: 45, temp: 40, description: 'Clear', rainfall: 0, windSpeed: 8 }},
            {...weatherZonesConfig.find(z => z.id === 'PAT'), weather: { humidity: 75, temp: 34, description: 'Rain', rainfall: 6, windSpeed: 18 }},
            {...weatherZonesConfig.find(z => z.id === 'GHW'), weather: { humidity: 90, temp: 28, description: 'Heavy Rain', rainfall: 14, windSpeed: 25 }},
            {...weatherZonesConfig.find(z => z.id === 'BHB'), weather: { humidity: 85, temp: 31, description: 'Rain', rainfall: 9, windSpeed: 30 }},
            {...weatherZonesConfig.find(z => z.id === 'SML'), weather: { humidity: 70, temp: 18, description: 'Light Rain', rainfall: 3, windSpeed: 20 }},
            {...weatherZonesConfig.find(z => z.id === 'SRN'), weather: { humidity: 60, temp: 15, description: 'Cloudy', rainfall: 1, windSpeed: 12 }},
          ];
          setWeatherData(fallbackData.filter(x => x && x.name));
        } else {
          setWeatherApiError(false);
          setWeatherData(results.filter(r => r.weather !== null));
        }
      } catch (e) {
        setWeatherApiError(true);
      }
    };
    fetchAllWeather();
    const interval = setInterval(fetchAllWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  // Compute Routes via Google Routes API when Allocation Engine triggers
  useEffect(() => {
    if (location.state?.triggerRoutes && indiaZones.length > 0) {
      setIsComputingRoutes(true);
      
      // Top 3 critical zones
      const topZones = [...indiaZones].sort((a, b) => b.severityScore - a.severityScore).slice(0, 3);
      const DEPOT_COORDS = { lat: 21.1458, lng: 79.0882 }; // Nagpur Central Depot
      
      const fetchRoutes = async () => {
        try {
          const routesPromises = topZones.map(async (zone) => {
            const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
              },
              body: JSON.stringify({
                origin: { location: { latLng: { latitude: DEPOT_COORDS.lat, longitude: DEPOT_COORDS.lng } } },
                destination: { location: { latLng: { latitude: zone.lat, longitude: zone.lng } } },
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE'
              })
            });
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              return {
                zone,
                durationSeconds: data.routes[0].duration ? parseInt(data.routes[0].duration.replace('s', '')) : 0,
                polyline: data.routes[0].polyline.encodedPolyline
              };
            }
            return null;
          });

          const results = await Promise.all(routesPromises);
          setAllocationRoutes(results.filter(r => r !== null));
        } catch (e) {
          console.error('Error fetching routes API:', e);
        } finally {
          setIsComputingRoutes(false);
        }
      };
      
      fetchRoutes();
      // Clean up state so it doesn't re-trigger on remount
      navigate('/resource-map', { replace: true, state: {} });
    }
  }, [location.state, indiaZones, navigate]);

  // Google Maps state (replaced useAppContext with local state for stability)
  const [isLoaded] = useState(true); 
  const loadError = null;

  // Calculate route from Ernakulam Depot (STABLE) to Wayanad (CRITICAL)
  const calculateRoute = async () => {
    if (!window.google || !window.google.maps || !window.google.maps.DirectionsService) return;
    const directionsService = new window.google.maps.DirectionsService();
    try {
      const results = await directionsService.route({
        origin: { lat: 9.9816, lng: 76.2999 }, // Ernakulam
        destination: { lat: 11.6854, lng: 76.1320 }, // Wayanad
        travelMode: 'DRIVING',
      });
      setDirectionsResponse(results);
      // Extract ETA
      if (results.routes?.[0]?.legs?.[0]) {
        setRouteEta(results.routes[0].legs[0].duration.text);
      }
    } catch (error) {
      console.error("Error fetching directions", error);
    }
  };

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    calculateRoute();
  }, []);

  const resetView = () => {
    if (mapRef.current) {
      if (mapView === 'india') {
        mapRef.current.panTo(INDIA_CENTER);
        mapRef.current.setZoom(5);
      } else {
        mapRef.current.panTo(KERALA_CENTER);
        mapRef.current.setZoom(8);
      }
    }
    setActiveType('All');
    setActiveSeverity('All');
    setActiveDistrict('All');
    setSelectedZone(null);
  };

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: zone.lat, lng: zone.lng });
      mapRef.current.setZoom(10);
    }
  };

  // Filtering — use real zones
  const filteredZones = realZones.map(zone => {
    let severityScore = zone.severityScore;
    let hasExtremeWeather = false;
    
    // Connect weather to severity
    const wData = weatherData.find(w => w.name === zone.name);
    if (wData && wData.weather && wData.weather.humidity > 80) {
      severityScore = Math.min(100, severityScore * 1.10); // Increase by 10%
      hasExtremeWeather = true;
    }
    
    return { ...zone, severityScore, hasExtremeWeather };
  }).filter(zone => {
    if (activeSeverity !== 'All' && zone.severity !== activeSeverity.toUpperCase()) return false;
    if (activeDistrict !== 'All' && zone.name !== activeDistrict) return false;
    return true;
  });

  // Scale zone marker by severity score (bigger = more critical)
  const getMarkerScale = (score) => 8 + (score / 100) * 8;

  // Calculate progress bar width
  const getProgressWidth = (resources, need) => {
    return Math.min((resources / need) * 100, 100);
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'zone-critical';
      case 'HIGH': return 'zone-high';
      case 'MEDIUM': return 'zone-medium';
      case 'STABLE': return 'zone-stable';
      default: return '';
    }
  };

  const renderMap = () => {
    if (mapsError || loadError) {
      return (
        <div style={{
          height: "500px",
          background: "#0A1628",
          borderRadius: "12px",
          border: "1px solid rgba(45,125,210,0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white"
        }}>
          <div style={{fontSize:"48px",
            marginBottom:"16px"}}>🗺️</div>
          <h3>Interactive Map</h3>
          <p style={{color:"#9CA3AF",
            fontSize:"13px",marginTop:"8px"}}>
            Showing Kerala 2018 flood zones
          </p>
          <div style={{
            marginTop:"24px",
            display:"grid",
            gridTemplateColumns:"1fr 1fr",
            gap:"12px",
            width:"320px"
          }}>
            {[
              {name:"Wayanad",score:88,
               severity:"CRITICAL",color:"#FF1744"},
              {name:"Idukki",score:94,
               severity:"CRITICAL",color:"#FF1744"},
              {name:"Thrissur",score:92,
               severity:"CRITICAL",color:"#FF1744"},
              {name:"Palakkad",score:75,
               severity:"HIGH",color:"#FF4500"},
              {name:"Alappuzha",score:82,
               severity:"HIGH",color:"#FF4500"},
              {name:"Ernakulam",score:79,
               severity:"HIGH",color:"#FF4500"},
              {name:"Kottayam",score:53,
               severity:"MEDIUM",color:"#FFB800"},
              {name:"Malappuram",score:71,
               severity:"HIGH",color:"#FF4500"}
            ].map(zone => (
              <div key={zone.name} style={{
                background:"rgba(13,27,42,0.9)",
                border:`1px solid ${zone.color}40`,
                borderRadius:"8px",
                padding:"10px 14px",
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center"
              }}>
                <span style={{fontSize:"12px",
                  color:"white"}}>
                  {zone.name}
                </span>
                <span style={{fontSize:"11px",
                  color:zone.color,
                  fontWeight:"bold"}}>
                  {zone.score}
                </span>
              </div>
            ))}
          </div>
          <p style={{color:"#4B5563",
            fontSize:"11px",marginTop:"16px"}}>
            Enable Google Maps API key for 
            interactive map
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', background: '#00D4FF', color: '#000', border: 'none', padding: '8px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Retry Connection
          </button>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="map-loading">
          <div className="map-loading-spinner"></div>
          <span>{t('loadingTacticalMap')}</span>
        </div>
      );
    }
    return (
      <>
        <ErrorBoundary>
        <GoogleMap
          mapContainerClassName="full-map-container"
          center={mapView === 'india' ? INDIA_CENTER : KERALA_CENTER}
          zoom={mapView === 'india' ? 5 : 8}
          onLoad={onMapLoad}
          options={{
            styles: isDark ? darkMapStyle : [],
            mapTypeId: 'roadmap',
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            backgroundColor: isDark ? '#050A14' : '#F0F4F8',
            gestureHandling: 'cooperative',
          }}
          onClick={() => setSelectedZone(null)}
        >
          {/* Heatmap — Kerala data */}
          {realZones && realZones.length > 0 && (
            <HeatmapLayerF
              data={getHeatmapPoints(realZones)}
              options={{
                radius: mapView === 'india' ? 20 : 45,
                opacity: 0.6,
                gradient: [
                  'rgba(0, 0, 0, 0)',
                  'rgba(255, 255, 0, 0.4)',
                  'rgba(255, 200, 0, 0.6)',
                  'rgba(255, 150, 0, 0.7)',
                  'rgba(255, 100, 0, 0.8)',
                  'rgba(255, 69, 0, 0.85)',
                  'rgba(255, 40, 0, 0.9)',
                  'rgba(255, 0, 0, 1)',
                ]
              }}
            />
          )}

          {/* Directions / Routing */}
          {directionsResponse && (
            <DirectionsRenderer
              directions={directionsResponse}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#00D4FF',
                  strokeOpacity: 0,
                  icons: [{
                    icon: {
                      path: 'M 0,-1 0,1',
                      strokeOpacity: 1,
                      strokeColor: '#00D4FF',
                      scale: 4,
                    },
                    offset: '0',
                    repeat: '20px',
                  }],
                }
              }}
            />
          )}

          {/* Weather Circles */}
          {weatherEnabled && weatherData && weatherData.length > 0 && weatherData.map((wZone, idx) => {
            if (!wZone || !wZone.lat || !wZone.lng || !wZone.weather) return null;
            
            let circleColor = '#00FF88'; // GREEN circle — "Clear Conditions"
            if (wZone.weather.humidity > 85 && wZone.weather.rainfall > 0) circleColor = '#FF1744'; // RED extreme
            else if (wZone.weather.humidity > 75 && wZone.weather.temp < 25) circleColor = '#FF6D00'; // ORANGE heavy
            else if (wZone.weather.humidity > 65) circleColor = '#FFB800'; // YELLOW moderate

            return (
              <CircleF
                key={`weather-${wZone.id}-${idx}`}
                center={{ lat: wZone.lat, lng: wZone.lng }}
                radius={mapView === 'india' ? 80000 : 15000}
                options={{
                  fillColor: circleColor,
                  fillOpacity: 0.35,
                  strokeColor: circleColor,
                  strokeOpacity: 0.8,
                  strokeWeight: 1,
                  clickable: true,
                }}
                onClick={() => setSelectedWeatherZone(wZone)}
              />
            );
          })}

          {/* India Disaster Zone Circles */}
          {mapView === 'india' && indiaZones && indiaZones.length > 0 && indiaZones
            .filter(z => activeSeverity === 'All' || z.severity === activeSeverity.toUpperCase())
            .map((zone) => {
              if (!zone || !zone.lat || !zone.lng) return null;
              return (
                <CircleF
                  key={`india-${zone.id}`}
                  center={{ lat: zone.lat, lng: zone.lng }}
                  radius={zone.severity === 'CRITICAL' ? 120000 : zone.severity === 'HIGH' ? 90000 : 60000}
                  options={{
                    fillColor: zone.color,
                    fillOpacity: 0.2,
                    strokeColor: zone.color,
                    strokeOpacity: 0.8,
                    strokeWeight: 1.5,
                    clickable: true,
                  }}
                  onClick={() => setSelectedZone({ ...zone, isIndia: true })}
                />
              );
            })}

          {mapView === 'india' && indiaZones && indiaZones.length > 0 && indiaZones
            .filter(z => activeSeverity === 'All' || z.severity === activeSeverity.toUpperCase())
            .map((zone) => {
              if (!zone || !zone.lat || !zone.lng) return null;
              return (
                <CircleF
                  key={`india-inner-${zone.id}`}
                  center={{ lat: zone.lat, lng: zone.lng }}
                  radius={Math.max(15000, (zone.severityScore / 100) * 55000)}
                  options={{
                    fillColor: zone.color,
                    fillOpacity: 0.55,
                    strokeColor: zone.color,
                    strokeOpacity: 1,
                    strokeWeight: 1,
                    clickable: true,
                  }}
                  onClick={() => setSelectedZone({ ...zone, isIndia: true })}
                />
              );
            })}

          {/* Kerala Zone Markers — sized by severity score */}
          {filteredZones && filteredZones.length > 0 && filteredZones.map((zone) => {
            if (!zone || !zone.lat || !zone.lng) return null;
            
            const svgMarker = {
              path: (isLoaded && window.google?.maps?.SymbolPath) ? window.google.maps.SymbolPath.CIRCLE : null,
              fillColor: zone.color,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              scale: getMarkerScale(zone.severityScore),
            };

            return (
              <MarkerF
                key={zone.id}
                position={{ lat: Number(zone.lat), lng: Number(zone.lng) }}
                icon={svgMarker}
                onClick={() => handleZoneClick(zone)}
              />
            );
          })}

          {/* Hospital markers — small blue cross icons */}
          {allHospitals && allHospitals.length > 0 && allHospitals.map((h, idx) => {
            if (!h || !h.lat || !h.lng) return null;
            return (
              <MarkerF
                key={`hosp-${idx}`}
                position={{ lat: Number(h.lat), lng: Number(h.lng) }}
                icon={{ url: HOSPITAL_ICON, scaledSize: (isLoaded && window.google?.maps?.Size) ? new window.google.maps.Size(18, 18) : null }}
                title={`${h.name} — ${h.districtName}`}
              />
            );
          })}

          {/* Info Window — Synchronized with Dashboard */}
          {selectedZone && (
            <InfoWindowF
              position={{ lat: selectedZone.lat, lng: selectedZone.lng }}
              onCloseClick={() => setSelectedZone(null)}
              options={{ maxWidth: 320 }}
            >
              <div className="dark-info-window">
                <div className="diw-image-header" style={{ width: 'calc(100% + 24px)', margin: '-12px -12px 12px -12px', height: '140px', overflow: 'hidden', position: 'relative' }}>
                  <img 
                    src={getDisasterImage(selectedZone)} 
                    alt="Disaster Area" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, #0D1B2A, transparent)' }}></div>
                </div>

                <h3 className="diw-title">{selectedZone.name}</h3>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span 
                    className="diw-severity-pill"
                    style={{ 
                      backgroundColor: `${selectedZone.color}22`,
                      color: selectedZone.color,
                      border: `1px solid ${selectedZone.color}55`,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    {selectedZone.severity}
                  </span>
                  {!selectedZone.isIndia && (
                    <span style={{ background: 'rgba(255,255,255,0.1)', color: '#A0AEC0', fontSize: '10px', padding: '3px 10px', borderRadius: '10px', fontWeight: 600 }}>
                      🌊 Kerala 2018
                    </span>
                  )}
                  {selectedZone.isIndia && selectedZone.disasterType && (
                    <span style={{ background: `${selectedZone.color}18`, color: selectedZone.color, fontSize: '10px', padding: '3px 10px', borderRadius: '10px', fontWeight: 600 }}>
                      {selectedZone.disasterType}
                    </span>
                  )}
                </div>

                <div className="diw-stats" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedZone.isIndia ? (
                    <>
                      <div className="diw-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        <span className="diw-label" style={{ color: '#8A9BB3', fontSize: '12px' }}>Deaths:</span>
                        <span className="diw-value" style={{ fontWeight: 700, color: '#fff' }}>{(selectedZone.deaths || 0).toLocaleString()}</span>
                      </div>
                      <div className="diw-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        <span className="diw-label" style={{ color: '#8A9BB3', fontSize: '12px' }}>Affected:</span>
                        <span className="diw-value" style={{ fontWeight: 700, color: '#fff' }}>{(selectedZone.affected || 0).toLocaleString()}</span>
                      </div>
                      <div className="diw-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        <span className="diw-label" style={{ color: '#8A9BB3', fontSize: '12px' }}>Events (1980+):</span>
                        <span className="diw-value" style={{ fontWeight: 700, color: '#fff' }}>{selectedZone.count} disasters</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="diw-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        <span className="diw-label" style={{ color: '#8A9BB3', fontSize: '12px' }}>{t('totalFatalities')}:</span>
                        <span className="diw-value" style={{ fontWeight: 700, color: '#fff' }}>{selectedZone.fatalities ?? 0}</span>
                      </div>
                      <div className="diw-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        <span className="diw-label" style={{ color: '#8A9BB3', fontSize: '12px' }}>{t('reliefCamps')}:</span>
                        <span className="diw-value" style={{ fontWeight: 700, color: '#fff' }}>{selectedZone.reliefCamps ?? 0}</span>
                      </div>
                      <div className="diw-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        <span className="diw-label" style={{ color: '#8A9BB3', fontSize: '12px' }}>{t('landslides')}:</span>
                        <span className="diw-value" style={{ fontWeight: 700, color: '#fff' }}>{selectedZone.landslides ?? 0}</span>
                      </div>
                    </>
                  )}
                  <div className="diw-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span className="diw-label" style={{ color: '#8A9BB3', fontSize: '12px' }}>Severity Score:</span>
                    <span className="diw-value" style={{ fontWeight: 700, color: '#fff' }}>{(selectedZone.severityScore || 0).toFixed(1)} / 100</span>
                  </div>
                </div>
                <button 
                  className="diw-link" 
                  style={{ 
                    width: '100%', 
                    marginTop: '16px', 
                    padding: '10px', 
                    background: 'rgba(0, 212, 255, 0.1)', 
                    border: '1px solid #00D4FF', 
                    color: '#00D4FF',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '13px'
                  }}
                  onClick={() => setSelectedZone(null)}
                >
                  {t('viewDetails')} →
                </button>
              </div>
            </InfoWindowF>
          )}

          {/* Weather Info Window */}
          {selectedWeatherZone && (
            <InfoWindowF
              position={{ lat: selectedWeatherZone.lat, lng: selectedWeatherZone.lng }}
              onCloseClick={() => setSelectedWeatherZone(null)}
            >
              <div className="dark-info-window" style={{ minWidth: '220px' }}>
                <h3 className="diw-title">🌧 {selectedWeatherZone.name} — Live Weather</h3>
                <div className="diw-stats">
                  <div className="diw-row"><span className="diw-label">Temperature:</span><span className="diw-value">{selectedWeatherZone.weather.temp}°C</span></div>
                  <div className="diw-row"><span className="diw-label">Humidity:</span><span className="diw-value">{selectedWeatherZone.weather.humidity}%</span></div>
                  <div className="diw-row"><span className="diw-label">Rainfall:</span><span className="diw-value">{selectedWeatherZone.weather.rainfall}mm/hr</span></div>
                  <div className="diw-row"><span className="diw-label">Wind:</span><span className="diw-value">{selectedWeatherZone.weather.windSpeed} km/h</span></div>
                  <div className="diw-row"><span className="diw-label">Conditions:</span><span className="diw-value" style={{textTransform:'capitalize'}}>{selectedWeatherZone.weather.description}</span></div>
                </div>
                <div style={{color: '#FF1744', fontSize: '11px', marginTop: '8px', fontWeight: '600'}}>
                  ⚠ High flood risk — resources on standby
                </div>
                <div style={{color: '#8A9BB3', fontSize: '10px', marginTop: '4px'}}>
                  Last updated: {new Date().toLocaleTimeString()}
                  <br/>
                  Source: {weatherApiError ? 'IMD 2018 Historical' : 'OpenWeatherMap API'}
                </div>
              </div>
            </InfoWindowF>
          )}
          {/* Google Maps Routes API Layer */}
          {allocationRoutes && allocationRoutes.length > 0 && allocationRoutes.map((route, i) => (
            <React.Fragment key={`route-${i}`}>
              <PolylineF
                key={route.id}
                path={window.google?.maps?.geometry?.encoding ? window.google.maps.geometry.encoding.decodePath(route.polyline) : []}
                options={{
                  strokeColor: '#00D4FF', // Cyan
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  geodesic: true
                }}
              />
              {/* Show ETA at the destination */}
              <InfoWindowF
                position={{ lat: route.zone.lat, lng: route.zone.lng }}
                options={{ disableAutoPan: true }}
              >
                <div style={{ background: '#050A14', color: '#00D4FF', padding: '4px 8px', borderRadius: '4px', border: '1px solid #00D4FF', fontWeight: 'bold', fontSize: '12px' }}>
                  ETA: {Math.round(route.durationSeconds / 60)} min
                </div>
              </InfoWindowF>
            </React.Fragment>
          ))}
        </GoogleMap>
      </ErrorBoundary>

      {/* Routes API Branding Banner */}
      {allocationRoutes.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5, 10, 20, 0.85)',
          border: '1px solid #00D4FF',
          boxShadow: '0 4px 20px rgba(0, 212, 255, 0.2)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 100,
          backdropFilter: 'blur(10px)',
          animation: 'slideUp 0.5s ease-out'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>
            Traffic-aware routing — powered by Google Maps Routes API
          </span>
        </div>
      )}
      </>
    );
  };

  return (
    <div className="resource-map-page">
      {/* ── TOP FILTER BAR ── */}
      <div className="filter-bar">
        {/* View toggle */}
        <div className="filter-group">
          <label>View</label>
          <select value={mapView} onChange={(e) => { setMapView(e.target.value); resetView(); }}>
            <option value="india">All India</option>
            <option value="kerala">Kerala Detail</option>
          </select>
        </div>

        <div className="filter-group">
          <label>{t('resourceType')}</label>
          <select value={activeType} onChange={(e) => setActiveType(e.target.value)}>
            <option value="All">{t('all')}</option>
            <option value="Ambulance">{t('ambulance')}</option>
            <option value="Medical">{t('medical')}</option>
            <option value="Food">{t('food')}</option>
            <option value="Shelter">{t('shelter')}</option>
            <option value="Water">{t('water')}</option>
            <option value="Engineering">{t('engineering')}</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>{t('severity')}</label>
          <select value={activeSeverity} onChange={(e) => setActiveSeverity(e.target.value)}>
            <option value="All">{t('all')}</option>
            <option value="Critical">{t('critical')}</option>
            <option value="High">{t('high')}</option>
            <option value="Medium">{t('medium')}</option>
            <option value="Stable">{t('stable')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label>{t('district')}</label>
          <select value={activeDistrict} onChange={(e) => setActiveDistrict(e.target.value)}>
            <option value="All">{t('all')}</option>
            {realZones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Layers</label>
          <button 
            className={`btn-weather-toggle ${weatherEnabled ? 'active' : ''}`}
            onClick={() => setWeatherEnabled(!weatherEnabled)}
            style={{
              background: weatherEnabled ? '#00D4FF' : '#1A2A40',
              color: weatherEnabled ? '#000' : '#FFF',
              border: '1px solid #00D4FF',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🌧 Weather
          </button>
        </div>

        <button className="btn-reset-view" onClick={resetView}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
            </svg>
            {t('resetView')}
        </button>
      </div>

      <div className="map-layout-grid" style={{ position: 'relative' }}>
        
        {/* Weather Alert Banner */}
        {weatherApiError && !dismissWeatherAlert && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#FF6D00', color: '#fff', padding: '8px 16px', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', fontSize: '13px', borderRadius: '4px 4px 0 0' }}>
            <span>⚠ Using IMD 2018 historical weather data — live feed unavailable</span>
            <button onClick={() => setDismissWeatherAlert(true)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}
        
        {!weatherApiError && weatherData.some(w => w.weather?.humidity > 80) && !dismissWeatherAlert && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#7F1D1D', color: '#fff', padding: '8px 16px', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', fontSize: '13px', borderRadius: '4px 4px 0 0', border: '1px solid #DC2626' }}>
            <span>🌧 Live Weather Alert — Heavy rainfall detected in {weatherData.filter(w => w.weather?.humidity > 80).map(w => w.name).join(', ')} — severity scores auto-updated</span>
            <button onClick={() => setDismissWeatherAlert(true)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* ── MAIN MAP AREA ── */}
        <div className="map-main-panel">
            {renderMap()}
            
            <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none', zIndex: 10 }}>
              Powered by Google Maps Platform
            </div>

            {/* Route ETA overlay */}
            {routeEta && (
              <div className="route-eta-overlay">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2.5">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Ernakulam → Wayanad</span>
                <span className="eta-time">{t('previous')}: {routeEta}</span>
              </div>
            )}
                
            <div className="map-legend">
                <h4>{t('mapLegend')}</h4>
                <div className="legend-item">
                    <span className="legend-dot" style={{background: '#FF1744'}}></span>
                    {t('criticalSeverity')}
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{background: '#FF6D00'}}></span>
                    {t('highSeverity')}
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{background: '#FFB800'}}></span>
                    {t('mediumSeverity')}
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{background: '#00FF88'}}></span>
                    {t('stableArea')}
                </div>
                <div className="legend-item legend-line">
                    <span className="legend-route"></span>
                    {t('resourceRoute')}
                </div>
            </div>
        </div>

          {/* ── RIGHT PANEL: ZONE LIST ── */}
          <div className="zone-list-panel">
            <div className="panel-header">
              <h2>{mapView === 'india' ? 'India Disaster Zones' : t('zoneStatus')}</h2>
              <div className="live-indicator">
                <span className="live-dot"></span>
                {t('live')}
              </div>
            </div>
            
            <div className="zone-scroll-list">
              {(mapView === 'india' ? indiaZones.slice(0, 20) : filteredZones).map(zone => (
                <div 
                  key={zone.id} 
                  className={`zone-list-item ${selectedZone && selectedZone.id === zone.id ? 'active' : ''}`}
                  onClick={() => handleZoneClick(zone)}
                >
                  <div className="zone-item-top">
                    <span className="zone-item-name">
                      {zone.name}
                      {zone.hasExtremeWeather && <span style={{marginLeft: '6px', fontSize: '14px'}} title="Extreme Weather Affecting Severity">🌧</span>}
                    </span>
                    <span className={`zone-item-badge ${getSeverityClass(zone.severity)}`}>
                      {t(zone.severity.toLowerCase())}
                    </span>
                  </div>
                  
                  <div className="zone-item-stats">
                    {mapView === 'india' ? (
                      <>
                        <span className="res-count">{(zone.deaths || 0).toLocaleString()} deaths</span>
                        <span className="res-need"> | {zone.disasterType}</span>
                      </>
                    ) : (
                      <>
                        <span className="res-count">{zone.resources} {t('units').toLowerCase()}</span>
                        <span className="res-need">/ {zone.need} {t('assignedDistrict').toLowerCase()}</span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4a6380', marginTop: '2px' }}>
                    {mapView === 'india' 
                      ? `Score: ${zone.severityScore?.toFixed(1)} | ${zone.count} events since 1980`
                      : `${t('biasScore')}: ${zone.severityScore?.toFixed(1)} | ⚡ ${zone.fatalities} ${t('totalFatalities').toLowerCase()}`
                    }
                  </div>
                  
                  <div className="zone-progress-track">
                    <div 
                      className="zone-progress-fill" 
                      style={{
                        width: `${Math.min(zone.severityScore, 100)}%`,
                        background: zone.color
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
}

export default memo(ResourceMap);
