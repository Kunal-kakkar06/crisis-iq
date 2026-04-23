// =====================================================
// CrisisIQ — Citizen Requests Page
// Real-time community assistance requests
// =====================================================

import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { GoogleMap, useJsApiLoader, HeatmapLayerF, Autocomplete } from '@react-google-maps/api';
import { darkMapStyle, GOOGLE_MAPS_ID, GOOGLE_MAPS_LIBRARIES } from '../config/googleMaps';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import './CitizenRequests.css';

// ── Mock Data ─────────────────────────────────────────

const initialRequests = [
  { id: 'CR-101', name: 'Priya Nair', location: 'Wayanad Medical Centre', priority: 'CRITICAL', message: "Requires immediate insulin supply — diabetic patient needs help urgently", time: '2 mins ago', lat: 11.6854, lng: 76.1320 },
  { id: 'CR-102', name: 'Rajan Menon', location: 'Idukki Tribal Village', priority: 'CRITICAL', message: "Entire village cut off by flooding — need food and water for 200 people", time: '14 mins ago', lat: 9.9189, lng: 76.9291 },
  { id: 'CR-103', name: 'Anoop Kumar', location: 'Thrissur District Hospital', priority: 'HIGH', message: "Medical oxygen cylinders critically low — ICU patients at risk", time: '28 mins ago', lat: 10.5276, lng: 76.2144 },
  { id: 'CR-104', name: 'Lakshmi Pillai', location: 'Palakkad Relief Camp', priority: 'MEDIUM', message: "Need blankets and warm clothing for 40 families", time: '1 hr ago', lat: 10.7867, lng: 76.6548 },
  { id: 'CR-105', name: 'Meena Krishnan', location: 'Malappuram Shelter', priority: 'LOW', message: "Requesting children books and activity material", time: '3 hrs ago', lat: 11.0510, lng: 76.0711 },
];

const sectorHealth = [
  { name: 'Wayanad', stat: 'Critical', value: 25, color: '#FF1744' },
  { name: 'Idukki', stat: 'Critical', value: 31, color: '#FF1744' },
  { name: 'Palakkad', stat: 'Stressed', value: 42, color: '#FF6D00' },
  { name: 'Thrissur', stat: 'Stressed', value: 58, color: '#FF6D00' },
  { name: 'Malappuram', stat: 'Moderate', value: 65, color: '#FFB800' },
  { name: 'Alappuzha', stat: 'Moderate', value: 72, color: '#FFB800' },
  { name: 'Kottayam', stat: 'Stable', value: 83, color: '#00FF88' },
  { name: 'Ernakulam', stat: 'Good', value: 91, color: '#00FF88' },
];

export default memo(function CitizenRequests() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosStatus, setSosStatus] = useState('idle'); // idle | typing | loading | success
  const [toastMessage, setToastMessage] = useState(null);
  const [sosLocation, setSosLocation] = useState('');
  const autocompleteRef = useRef(null);

  // Map configuration
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const heatmapData = useMemo(() => {
    if (!isLoaded || !window.google) return [];
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
    setSosModalVisible(true);
    setSosStatus('typing');
    setSosLocation('');
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      setSosLocation(place.formatted_address || place.name || '');
    }
  };

  const submitSosLocation = () => {
    setSosStatus('loading');
    setTimeout(() => {
      setSosStatus('success');
    }, 2000);
  };

  const closeSosModal = () => {
    setSosModalVisible(false);
    setSosStatus('idle');
  };

  const handleAssignResource = (location) => {
    // API mock
    setToastMessage(`Resource assigned to ${location.split(' ')[0]} — ETA 4.2 minutes via Google Maps routing`);
    setTimeout(() => setToastMessage(null), 4000);
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

      {sosModalVisible && (
        <div className="cr-modal-overlay">
          <div className="cr-modal">
            {sosStatus === 'typing' ? (
              <div className="cr-modal-content typing">
                <h3>{t('selectLocation')}</h3>
                <p>{t('provideExactLocation')}</p>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(ac) => (autocompleteRef.current = ac)}
                    onPlaceChanged={handlePlaceChanged}
                  >
                    <input
                      type="text"
                      className="cr-autocomplete-input"
                      placeholder={t('startTypingLocation')}
                      value={sosLocation}
                      onChange={(e) => setSosLocation(e.target.value)}
                    />
                  </Autocomplete>
                ) : (
                  <input type="text" className="cr-autocomplete-input" disabled placeholder="Loading map services..." />
                )}
                <button className="cr-btn-submit" onClick={submitSosLocation}>
                  {t('sendEmergencyAlert')}
                </button>
                <button className="cr-btn-cancel" onClick={closeSosModal}>
                  {t('cancel')}
                </button>
              </div>
            ) : sosStatus === 'loading' ? (
              <div className="cr-modal-content loading">
                <div className="cr-spinner"></div>
                <h3>{t('sendingSosAlert')}</h3>
                <p>{t('pinpointingCoordinates')} {sosLocation || t('yourLocation')}...</p>
              </div>
            ) : (
              <div className="cr-modal-content success">
                <div className="cr-success-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3>{t('sosReceived')}</h3>
                <p>{t('dispatchingNearestUnit')}</p>
                <button className="cr-btn-close" onClick={closeSosModal}>{t('acknowledge')}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="cr-header">
        <div className="cr-title-area">
          <h1 className="cr-title">{t('citizenRequests')}</h1>
          <p className="cr-subtitle">
            {t('realTimeCommunityAssistance')} — powered by&nbsp;
            <span className="cr-google-text">
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                <path fill="#4285F4" d="M12 2L2 7l10 5l10-5l-10-5z" />
                <path fill="#34A853" d="M2 17l10 5l10-5M2 12l10 5l10-5" />
              </svg>
              Google Cloud
            </span>&nbsp;Speech-to-Text and Vision API
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

                <div className="cr-card-actions">
                  <button className="cr-btn-assign" onClick={() => handleAssignResource(req.location)}>
                    {t('assignResource')}
                  </button>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${req.lat},${req.lng}`} target="_blank" rel="noopener noreferrer" className="cr-btn-map">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    {t('viewOnMap')}
                  </a>
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
                  center={{ lat: 10.5, lng: 76.5 }}
                  zoom={7}
                  options={{
                    styles: isDark ? darkMapStyle : [],
                    disableDefaultUI: true,
                    zoomControl: true,
                    backgroundColor: isDark ? '#050A14' : '#F0F4F8'
                  }}
                >
                  {heatmapData.length > 0 && (
                    <HeatmapLayerF
                      data={heatmapData}
                      options={{
                        radius: 25,
                        opacity: 0.9,
                        gradient: [
                          'rgba(0, 255, 255, 0)',
                          'rgba(0, 255, 255, 1)',
                          'rgba(0, 191, 255, 1)',
                          'rgba(0, 127, 255, 1)',
                          'rgba(0, 63, 255, 1)',
                          'rgba(0, 0, 255, 1)',
                          'rgba(0, 0, 223, 1)',
                          'rgba(0, 0, 191, 1)',
                          'rgba(0, 0, 159, 1)',
                          'rgba(0, 0, 127, 1)',
                          'rgba(63, 0, 91, 1)',
                          'rgba(127, 0, 63, 1)',
                          'rgba(191, 0, 31, 1)',
                          'rgba(255, 0, 0, 1)'
                        ]
                      }}
                    />
                  )}
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
                      {t(sector.stat.toLowerCase()) || sector.stat} ({sector.value}%)
                    </span>
                  </div>
                  <div className="cr-hi-track">
                    <div 
                      className="cr-hi-fill" 
                      style={{ 
                        width: `${sector.value}%`,
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
    </div>
  );
});
