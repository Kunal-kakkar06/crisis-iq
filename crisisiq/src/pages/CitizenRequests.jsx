// =====================================================
// CrisisIQ — Citizen Requests Page
// Real-time community assistance requests
// =====================================================

import { useState, useCallback, useMemo, useRef, memo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMap, HeatmapLayerF, CircleF, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { darkMapStyle, GOOGLE_MAPS_ID, GOOGLE_MAPS_LIBRARIES } from '../config/googleMaps';
import { getIndiaDisasterZones } from '../utils/dataLoader';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import SOSModal from '../components/SOSModal';
import './CitizenRequests.css';

// ── Mock Data ─────────────────────────────────────────

const initialRequests = [
  { id: 'CR-101', name: 'Priya Nair', location: 'Wayanad Medical Centre', priority: 'CRITICAL', message: "Requires immediate insulin supply — diabetic patient needs help urgently", time: '2 mins ago', lat: 11.6854, lng: 76.1320 },
  { id: 'CR-102', name: 'Rajan Menon', location: 'Idukki Tribal Village', priority: 'CRITICAL', message: "Entire village cut off by flooding — need food and water for 200 people", time: '14 mins ago', lat: 9.9189, lng: 76.9291 },
  { id: 'CR-103', name: 'Anoop Kumar', location: 'Thrissur District Hospital', priority: 'HIGH', message: "Medical oxygen cylinders critically low — ICU patients at risk", time: '28 mins ago', lat: 10.5276, lng: 76.2144 },
  { id: 'CR-104', name: 'Lakshmi Pillai', location: 'Palakkad Relief Camp', priority: 'MEDIUM', message: "Need blankets and warm clothing for 40 families", time: '1 hr ago', lat: 10.7867, lng: 76.6548 },
  { id: 'CR-105', name: 'Meena Krishnan', location: 'Malappuram Shelter', priority: 'LOW', message: "Requesting children books and activity material", time: '3 hrs ago', lat: 11.0510, lng: 76.0711 },
];

// Extra India-wide requests generated from disaster zones (appended to Kerala mock data)
const INDIA_EXTRA_REQUESTS = [
  { id: 'CR-201', name: 'Arun Sharma', location: 'Odisha Coastal District', priority: 'CRITICAL', message: 'Cyclone aftermath — 3000 families displaced, need immediate shelter and food', time: '5 mins ago', lat: 20.94, lng: 85.09 },
  { id: 'CR-202', name: 'Deepa Singh', location: 'Bihar Flood Zone', priority: 'CRITICAL', message: 'Village submerged — 800 people stranded on rooftops, need rescue boats', time: '11 mins ago', lat: 25.09, lng: 85.31 },
  { id: 'CR-203', name: 'Ravi Kumar', location: 'Uttarakhand Landslide Area', priority: 'HIGH', message: 'Road blocked by landslide — 200 tourists stranded, need evacuation', time: '32 mins ago', lat: 30.06, lng: 79.01 },
  { id: 'CR-204', name: 'Sunita Devi', location: 'Assam Flood Region', priority: 'HIGH', message: 'Flood water entering homes — need pumps and medical supplies', time: '1 hr ago', lat: 26.20, lng: 92.93 },
  { id: 'CR-205', name: 'Rahul Patel', location: 'Gujarat Earthquake Zone', priority: 'MEDIUM', message: 'Building cracks spotted — need structural assessment team', time: '2 hrs ago', lat: 23.02, lng: 72.57 },
];


export default function CitizenRequests() {
  console.log("[CitizenRequests] Rendering component...");
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([...initialRequests, ...INDIA_EXTRA_REQUESTS]);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sosOpen, setSosOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [indiaZones, setIndiaZones] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5, lng: 78.5 });
  const [mapZoom, setMapZoom] = useState(4);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [foundHospitals, setFoundHospitals] = useState([]);
  const [nearestDistances, setNearestDistances] = useState({});
  const mapRef = useRef(null);
  const [sectorHealth, setSectorHealth] = useState([
    {name:"Wayanad", status:"Critical", percent:25, color:"#FF1744"},
    {name:"Idukki", status:"Critical", percent:31, color:"#FF1744"},
    {name:"Palakkad", status:"Stressed", percent:42, color:"#FF4500"},
    {name:"Thrissur", status:"Stressed", percent:58, color:"#FF4500"},
    {name:"Alappuzha", status:"Moderate", percent:65, color:"#FFB800"},
    {name:"Malappuram", status:"Moderate", percent:68, color:"#FFB800"},
    {name:"Bihar", status:"Stressed", percent:39, color:"#FF4500"},
    {name:"Assam", status:"Critical", percent:28, color:"#FF1744"},
    {name:"Uttarakhand", status:"Moderate", percent:55, color:"#FFB800"},
    {name:"Ernakulam", status:"Good", percent:91, color:"#00FF88"}
  ]);

  useEffect(() => {
    if (searchParams.get('sos') === 'true') {
      setSosOpen(true);
    }
  }, [searchParams]);

  // Load India disaster zones (only for map circles now)
  useEffect(() => {
    getIndiaDisasterZones().then(zones => {
      setIndiaZones(zones);
    }).catch(console.error);
  }, []);

  // Map configuration (replaced useAppContext with local state)
  const [mapLoaded] = useState(true);
  const isLoaded = mapLoaded && typeof window !== 'undefined' && !!window.google && !!window.google.maps.visualization;
  
  useEffect(() => {
    console.log("[CitizenRequests] isLoaded state changed:", isLoaded);
  }, [isLoaded]);

  const heatmapData = useMemo(() => {
    if (!isLoaded || !window.google || !window.google.maps.visualization) {
      console.log("[CitizenRequests] Map or visualization library not ready.");
      return [];
    }
    // Generate cluster around Wayanad and Idukki for density visualization
    return requests.flatMap(req => {
      // Create a few data points per request to make the heatmap glow
      const points = [];
      const intensity = req.priority === 'CRITICAL' ? 5 : req.priority === 'HIGH' ? 3 : 1;
      for (let i = 0; i < intensity; i++) {
        points.push(new window.google.maps.LatLng(
          req.lat + (Math.random() - 0.5) * 0.05,
          req.lng + (Math.random() - 0.5) * 0.05
        ));
      }
      return points;
    });
  }, [isLoaded, requests]);

  const handleSosClick = () => {
    setSosOpen(true);
  };


  const handleAssignResource = (location) => {
    // API mock
    setToastMessage(`Resource assigned to ${location.split(' ')[0]} — ETA 4.2 minutes via Google Maps routing`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const computeDistanceKm = (lat1, lng1, lat2, lng2) => {
    if (!window.google || !window.google.maps.geometry) return 0;
    const p1 = new window.google.maps.LatLng(lat1, lng1);
    const p2 = new window.google.maps.LatLng(lat2, lng2);
    return (window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2) / 1000).toFixed(1);
  };

  const handleViewOnMap = (req) => {
    setMapCenter({ lat: req.lat, lng: req.lng });
    setMapZoom(12);
    setActiveRequestId(req.id);
    
    if (!mapRef.current || !window.google) return;
    
    const service = new window.google.maps.places.PlacesService(mapRef.current);
    service.nearbySearch(
      {
        location: { lat: req.lat, lng: req.lng },
        radius: 10000,
        type: 'hospital'
      },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const top3 = results.slice(0, 3).map(place => {
            const placeLat = place.geometry.location.lat();
            const placeLng = place.geometry.location.lng();
            const dist = computeDistanceKm(req.lat, req.lng, placeLat, placeLng);
            return {
              ...place,
              distance: dist
            };
          });
          
          setFoundHospitals(top3);
          
          if (top3.length > 0) {
            setNearestDistances(prev => ({
              ...prev,
              [req.id]: top3[0].distance
            }));
          }
        } else {
          setFoundHospitals([]);
        }
      }
    );
  };

  // Filter Logic
  const displayRequests = requests.filter(req => {
    if (filter !== 'ALL' && req.priority !== filter) return false;
    if (searchQuery && !req.message.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !req.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !req.location.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="cr-page">
      {/* ── Toasts & Modals ── */}
      {toastMessage && (
        <div className="cr-toast animate-slide-up">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}


      {/* ── Page Header ── */}
      <div className="cr-header">
        <div className="cr-title-area">
          <h1 className="cr-title">{t('citizenRequests')}</h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time community assistance requests
            — powered by Google Cloud 
            Speech-to-Text and Vision API
          </p>
        </div>
        <button className="cr-btn-sos" onClick={handleSosClick}>
          {t('sosINeedHelp')}
        </button>
      </div>

      <div className="cr-layout">
        {/* ── LEFT PANEL: Requests Feed ── */}
        <div className="cr-left-panel">
          
          <div className="cr-search-bar">
            <div className="cr-search-wrapper">
              <svg className="cr-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input 
                type="text" 
                placeholder={t('searchRequests')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="cr-filters">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                <button 
                  key={f}
                  className={`cr-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {t(f.toLowerCase())}
                </button>
              ))}
            </div>
          </div>

          <div className="cr-speech-info">
            <span className="cr-speech-icon">🎙️</span>
            <span><strong>{t('voiceReportsSupported')}</strong> — {t('voiceReportsSubtext')}</span>
          </div>

          <div className="cr-requests-list">
            {displayRequests.map((req) => (
              <div key={req.id} className={`cr-card ${req.priority.toLowerCase()}`}>
                <div className="cr-card-top">
                  <div className="cr-card-meta">
                    <span className="cr-name">{req.name}</span>
                    <span className="cr-time">{req.time}</span>
                  </div>
                  <span className={`cr-badge badge-${req.priority.toLowerCase()}`}>
                    {t(req.priority.toLowerCase()) || req.priority}
                  </span>
                </div>
                
                <div className="cr-location">
                  <span className="loc-icon">📍</span> {req.location}
                </div>
                
                <div className="cr-message">
                  &ldquo;{req.message}&rdquo;
                </div>

                {nearestDistances[req.id] && (
                  <div className="cr-nearest-facility" style={{ color: '#00D4FF', fontSize: '13px', marginTop: '6px', fontWeight: 'bold' }}>
                    🏥 Nearest medical facility: {nearestDistances[req.id]} km
                  </div>
                )}

                <div className="cr-card-actions">
                  <button className="cr-btn-assign" onClick={() => handleAssignResource(req.location)}>
                    {t('assignResource')}
                  </button>
                  <button className="cr-btn-map" onClick={() => handleViewOnMap(req)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    {t('viewOnMap')}
                  </button>
                </div>
              </div>
            ))}
            {displayRequests.length === 0 && (
              <div className="cr-empty">No requests match the current filters.</div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Maps & Health ── */}
        <div className="cr-right-panel">
          
          <div className="cr-map-card">
            <div className="cr-map-header">
              <h3>{t('requestDensityMap')}</h3>
              <span className="cr-map-badge">LIVE HEATMAP</span>
            </div>
            
            <div className="cr-map-container" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none', zIndex: 10 }}>
                Powered by Google Maps Platform
              </div>
              {!isLoaded ? (
                <div className="cr-map-fallback">Loading Google Maps...</div>
              ) : window.google === undefined && !import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                <div className="cr-map-fallback no-api">
                  <p>Request Density Visualization</p>
                  <span>Requires valid API Key</span>
                </div>
              ) : (
                <GoogleMap
                  mapContainerClassName="cr-google-map"
                  center={mapCenter}
                  zoom={mapZoom}
                  onLoad={(map) => { mapRef.current = map; }}
                  options={{
                    styles: isDark ? darkMapStyle : [],
                    disableDefaultUI: true,
                    zoomControl: true,
                    backgroundColor: isDark ? '#050A14' : '#F0F4F8'
                  }}
                >
                  {/* India disaster zone circles on citizen map */}
                  {indiaZones.slice(0, 15).map(zone => (
                    <CircleF
                      key={`cr-${zone.id}`}
                      center={{ lat: zone.lat, lng: zone.lng }}
                      radius={80000}
                      options={{
                        fillColor: zone.color,
                        fillOpacity: 0.12,
                        strokeColor: zone.color,
                        strokeOpacity: 0.6,
                        strokeWeight: 1,
                        clickable: false,
                      }}
                    />
                  ))}
                  
                  {activeRequestId && (
                    <MarkerF
                      position={mapCenter}
                      icon={isLoaded && window.google ? {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#FF1744',
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2,
                        scale: 8
                      } : null}
                    />
                  )}
                  {activeRequestId && foundHospitals.map((hospital, index) => (
                    <MarkerF
                      key={hospital.place_id || index}
                      position={{
                        lat: hospital.geometry.location.lat(),
                        lng: hospital.geometry.location.lng()
                      }}
                      icon={isLoaded && window.google ? {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#00D4FF',
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2,
                        scale: 6
                      } : null}
                    >
                      <InfoWindowF
                        position={{
                          lat: hospital.geometry.location.lat(),
                          lng: hospital.geometry.location.lng()
                        }}
                        options={{
                          pixelOffset: isLoaded && window.google ? new window.google.maps.Size(0, -15) : null,
                          disableAutoPan: true
                        }}
                      >
                        <div style={{ color: '#000', padding: '2px 4px', fontSize: '12px', fontWeight: 'bold' }}>
                          <div>{hospital.name}</div>
                          <div style={{ color: '#0056b3', marginTop: '2px' }}>{hospital.distance} km away</div>
                        </div>
                      </InfoWindowF>
                    </MarkerF>
                  ))}
                </GoogleMap>
              )}
            </div>
          </div>

          <div className="cr-health-card">
            <h3>{t('sectorHealthIndicators')}</h3>
            
            <div className="cr-health-list">
              {sectorHealth.map(sector => (
                <div key={sector.name} className="cr-health-item">
                  <div className="cr-hi-top">
                    <span className="cr-hi-name">{sector.name}</span>
                    <span className="cr-hi-stat" style={{ color: sector.color }}>
                      {sector.status} ({sector.percent}%)
                    </span>
                  </div>
                  <div className="cr-hi-track">
                    <div 
                      className="cr-hi-fill" 
                      style={{ 
                        width: `${sector.percent}%`,
                        backgroundColor: sector.color 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      <SOSModal 
        isOpen={sosOpen} 
        onClose={() => setSosOpen(false)} 
      />
    </div>
  );
}
