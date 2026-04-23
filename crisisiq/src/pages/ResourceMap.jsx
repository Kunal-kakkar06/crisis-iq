// ============================================
// CrisisIQ — Resource Map Page
// ============================================
// Full-width map showing resource locations,
// heatmaps, and routing using Google Maps API.
// ============================================

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  MarkerF, 
  InfoWindowF,
  HeatmapLayerF,
  DirectionsRenderer
} from '@react-google-maps/api';
import { 
  darkMapStyle, 
  KERALA_CENTER, 
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_ID,
} from '../config/googleMaps';
import { getKeralaZones } from '../utils/dataLoader';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import './ResourceMap.css';

// ── Generate weighted heatmap points using real severity scores ──
const getHeatmapPoints = (zones) => {
  if (!window.google || !zones) return [];
  const points = [];
  zones.forEach(zone => {
    const intensity = zone.severityScore / 100;
    const count = Math.ceil(intensity * 20);
    for (let i = 0; i < count; i++) {
      const jitterLat = zone.lat + (Math.random() - 0.5) * 0.12;
      const jitterLng = zone.lng + (Math.random() - 0.5) * 0.12;
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


function ResourceMap() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [selectedZone, setSelectedZone] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [activeType, setActiveType] = useState('All');
  const [activeSeverity, setActiveSeverity] = useState('All');
  const [activeDistrict, setActiveDistrict] = useState('All');
  const [routeEta, setRouteEta] = useState(null);
  const [realZones, setRealZones] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const mapRef = useRef(null);

  // Load real CSV data
  useEffect(() => {
    getKeralaZones().then(zones => {
      setRealZones(zones);
      // Flatten all hospitals from all zones
      const hospitals = zones.flatMap(z =>
        (z.hospitals || []).map(h => ({ ...h, districtName: z.name }))
      );
      setAllHospitals(hospitals);
    }).catch(console.error);
  }, []);

  // Load Maps with visualization + places libraries
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    calculateRoute();
  }, []);

  // Calculate route from Ernakulam Depot (STABLE) to Wayanad (CRITICAL)
  const calculateRoute = async () => {
    if (!window.google) return;
    const directionsService = new window.google.maps.DirectionsService();
    try {
      const results = await directionsService.route({
        origin: { lat: 9.9816, lng: 76.2999 }, // Ernakulam
        destination: { lat: 11.6854, lng: 76.1320 }, // Wayanad
        travelMode: window.google.maps.TravelMode.DRIVING,
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

  const resetView = () => {
    if (mapRef.current) {
      mapRef.current.panTo(KERALA_CENTER);
      mapRef.current.setZoom(8);
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
  const filteredZones = realZones.filter(zone => {
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
    if (loadError) {
      return <div className="map-error">{t('requiresValidApiKey')}: {loadError.message}</div>;
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
      <GoogleMap
        mapContainerClassName="full-map-container"
        center={KERALA_CENTER}
        zoom={8}
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
        {/* Heatmap Layer with real intensity from severity scores */}
        <HeatmapLayerF
          data={getHeatmapPoints(realZones)}
          options={{
            radius: 45,
            opacity: 0.7,
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

        {/* Zone Markers — sized by real severity score */}
        {filteredZones.map((zone) => {
          const svgMarker = {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: zone.color,
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: getMarkerScale(zone.severityScore),
          };

          return (
            <MarkerF
              key={zone.id}
              position={{ lat: zone.lat, lng: zone.lng }}
              icon={svgMarker}
              onClick={() => handleZoneClick(zone)}
            />
          );
        })}

        {/* Hospital markers — small blue cross icons */}
        {allHospitals.map((h, idx) => (
          <MarkerF
            key={`hosp-${idx}`}
            position={{ lat: h.lat, lng: h.lng }}
            icon={{ url: HOSPITAL_ICON, scaledSize: window.google ? new window.google.maps.Size(18, 18) : null }}
            title={`${h.name} — ${h.districtName}`}
          />
        ))}

        {/* Custom Dark-Themed Info Window */}
        {selectedZone && (
          <InfoWindowF
            position={{ lat: selectedZone.lat, lng: selectedZone.lng }}
            onCloseClick={() => setSelectedZone(null)}
            options={{ maxWidth: 320 }}
          >
              <div className="dark-info-window">
                <h3 className="diw-title">{selectedZone.name}</h3>
                <span 
                  className="diw-severity-pill"
                  style={{ 
                    backgroundColor: `${selectedZone.color}22`,
                    color: selectedZone.color,
                    border: `1px solid ${selectedZone.color}55`
                  }}
                >
                  {t(selectedZone.severity.toLowerCase())} — {t('biasScore')}: {selectedZone.severityScore?.toFixed(1)}
                </span>
                <div className="diw-stats">
                  <div className="diw-row">
                    <span className="diw-label">{t('totalFatalities')}:</span>
                    <span className="diw-value">{selectedZone.fatalities ?? 'N/A'}</span>
                  </div>
                  <div className="diw-row">
                    <span className="diw-label">{t('rainfallExcess')}:</span>
                    <span className="diw-value">{selectedZone.rainfallDeviation?.toFixed(0) ?? 'N/A'} mm</span>
                  </div>
                  <div className="diw-row">
                    <span className="diw-label">{t('landslides')}:</span>
                    <span className="diw-value">{selectedZone.landslides ?? 'N/A'}</span>
                  </div>
                  <div className="diw-row">
                    <span className="diw-label">{t('nearestHospital')}:</span>
                    <span className="diw-value">{selectedZone.hospitals?.[0]?.name?.slice(0, 28) || 'No data'}</span>
                  </div>
                  <div className="diw-row">
                    <span className="diw-label">{t('reliefCamps')}:</span>
                    <span className="diw-value">{selectedZone.reliefCamps ?? 'N/A'}</span>
                  </div>
                </div>
                <a className="diw-link" href="#" onClick={(e) => e.preventDefault()}>
                  {t('viewDetails')} →
                </a>
              </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    );
  };

  return (
    <div className="resource-map-page">
      {/* ── TOP FILTER BAR ── */}
      <div className="filter-bar">
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

        <button className="btn-reset-view" onClick={resetView}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
            </svg>
            {t('resetView')}
        </button>
      </div>

      <div className="map-layout-grid">
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
                <h2>{t('zoneStatus')}</h2>
                <div className="live-indicator">
                    <span className="live-dot"></span>
                    {t('live')}
                </div>
            </div>
            
            <div className="zone-scroll-list">
                {filteredZones.map(zone => (
                    <div 
                        key={zone.id} 
                        className={`zone-list-item ${selectedZone && selectedZone.id === zone.id ? 'active' : ''}`}
                        onClick={() => handleZoneClick(zone)}
                    >
                        <div className="zone-item-top">
                            <span className="zone-item-name">{zone.name}</span>
                            <span className={`zone-item-badge ${getSeverityClass(zone.severity)}`}>
                                {t(zone.severity.toLowerCase())}
                            </span>
                        </div>
                        
                        <div className="zone-item-stats">
                            <span className="res-count">{zone.resources} {t('units').toLowerCase()}</span>
                            <span className="res-need">/ {zone.need} {t('assignedDistrict').toLowerCase()}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#4a6380', marginTop: '2px' }}>
                            {t('biasScore')}: {zone.severityScore?.toFixed(1)} | ⚡ {zone.fatalities} {t('totalFatalities').toLowerCase()}
                        </div>
                        
                        <div className="zone-progress-track">
                            <div 
                                className="zone-progress-fill" 
                                style={{
                                    width: `${Math.min((zone.resources / Math.max(zone.need, 1)) * 100, 100)}%`,
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
