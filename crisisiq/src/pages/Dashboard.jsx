// ============================================
// CrisisIQ — Dashboard Page
// ============================================
// Command center with real-time KPIs, tactical
// map, fairness metrics, and live feeds.
// ============================================

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, CircleF, InfoWindowF } from '@react-google-maps/api';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc } from 'firebase/firestore';
import { darkMapStyle, keralaZones as staticKeralaZones, GOOGLE_MAPS_ID } from '../config/googleMaps';
import { getKeralaZones, getNationalStats, isUsingFallback, getIndiaDisasterZones } from '../utils/dataLoader';
import indiaMapImg from '../assets/india_fallback_map.png';
import disasterFlood from '../assets/disaster_flood.png';
import disasterLandslide from '../assets/disaster_landslide.png';
import disasterCyclone from '../assets/disaster_cyclone.png';
import { useLanguage } from '../context/LanguageContext';
import { useAppContext } from '../context/AppContext';
import './Dashboard.css';

// ── Count-Up Animation Hook ───────────────────
function useCountUp(target, duration = 2000, decimals = 0) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = eased * target;

      if (progress >= 1) {
        setCount(target || 0);
      } else {
        const val = eased * (target || 0);
        setCount(parseFloat(val.toFixed(decimals)));
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, decimals]);

  return count;
}

// ── Mock Allocation Data ──────────────────────
const allocationData = [
  { id: 'RES-001', type: 'Medical Unit', district: 'Wayanad', priority: 'CRITICAL', status: 'EN ROUTE' },
  { id: 'RES-002', type: 'Food Supply', district: 'Idukki', priority: 'CRITICAL', status: 'DEPLOYED' },
  { id: 'RES-003', type: 'Rescue Boat', district: 'Palakkad', priority: 'CRITICAL', status: 'EN ROUTE' },
  { id: 'RES-004', type: 'Shelter Kit', district: 'Thrissur', priority: 'HIGH', status: 'DEPLOYED' },
  { id: 'RES-005', type: 'Water Purifier', district: 'Malappuram', priority: 'HIGH', status: 'STANDBY' },
  { id: 'RES-006', type: 'Generator', district: 'Alappuzha', priority: 'HIGH', status: 'EN ROUTE' },
  { id: 'RES-007', type: 'Medical Unit', district: 'Kottayam', priority: 'MEDIUM', status: 'DEPLOYED' },
  { id: 'RES-008', type: 'Food Supply', district: 'Ernakulam', priority: 'MEDIUM', status: 'STANDBY' },
];

// ── Mock Audit Logs ───────────────────────────
const mockAuditLogs = [
  { id: '1', timestamp: '19:42:18', action: 'Resource reallocation triggered', zone: 'Wayanad', type: 'allocation' },
  { id: '2', timestamp: '19:38:05', action: 'Bias check passed', zone: 'Idukki', type: 'fairness' },
  { id: '3', timestamp: '19:35:22', action: 'Priority escalation approved', zone: 'Palakkad', type: 'escalation' },
  { id: '4', timestamp: '19:31:48', action: 'Supply drop confirmed', zone: 'Thrissur', type: 'allocation' },
  { id: '5', timestamp: '19:28:11', action: 'Citizen request fulfilled', zone: 'Malappuram', type: 'request' },
  { id: '6', timestamp: '19:24:36', action: 'New zone activated', zone: 'Alappuzha', type: 'activation' },
  { id: '7', timestamp: '19:20:02', action: 'Route optimized by AI', zone: 'Kottayam', type: 'optimization' },
];

// ── Mock Citizen Requests ─────────────────────
const mockCitizenRequests = [
  { id: '1', name: 'Anitha Kumari', priority: 'CRITICAL', location: 'Wayanad — Meppadi', time: '2 min ago', type: 'Medical Emergency' },
  { id: '2', name: 'Rajesh Menon', priority: 'HIGH', location: 'Idukki — Munnar', time: '8 min ago', type: 'Shelter Needed' },
  { id: '3', name: 'Priya Nair', priority: 'MEDIUM', location: 'Thrissur — Chalakudy', time: '14 min ago', type: 'Food & Water' },
];

// ── Translation Key Maps ───────────────────────
const resourceTypeKeyMap = {
  "Medical Unit":     "resourceTypes.medicalUnit",
  "Search & Rescue":  "resourceTypes.searchAndRescue",
  "Food Supply":      "resourceTypes.foodSupply",
  "Water Tanker":     "resourceTypes.waterTanker",
  "Water Purifier":   "resourceTypes.waterTanker", // Mapping similar items
  "Engineering Team": "resourceTypes.engineeringTeam",
  "Shelter Kit":      "resourceTypes.shelterKit",
  "Ambulance":        "resourceTypes.ambulance",
  "Police Support":   "resourceTypes.policeSupport",
  "Rescue Boat":      "resourceTypes.searchAndRescue",
  "Generator":        "resourceTypes.engineeringTeam",
};

const statusKeyMap = {
  "DEPLOYED": "status.deployed",
  "STANDBY":  "status.standby",
  "TRANSIT":  "status.transit",
  "INACTIVE": "status.inactive",
  "EN ROUTE": "status.enroute",
};

const auditActionKeyMap = {
  "Resource reallocation triggered": "audit.resourceReallocationTriggered",
  "Bias check passed":               "audit.biasCheckPassed",
  "Priority escalation approved":    "audit.priorityEscalationApproved",
  "Supply drop confirmed":           "audit.supplyDropConfirmed",
  "Citizen request fulfilled":       "audit.citizenRequestFulfilled",
  "New zone activated":              "audit.newZoneActivated",
  "Route optimized by AI":           "audit.routeOptimizedByAi",
};

// ── Stat Card Component ───────────────────────
function StatCard({ icon, label, value, decimals, suffix, change, glowColor }) {
  const animatedValue = useCountUp(value, 2200, decimals);

  const formatNumber = (num) => {
    if (decimals > 0) return num.toFixed(decimals);
    return num.toLocaleString();
  };

  return (
    <div className="stat-card" style={{ '--glow-color': glowColor }}>
      <div className="stat-icon" style={{ color: glowColor }}>
        {icon}
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value" style={{ color: glowColor }}>
          {formatNumber(animatedValue)}{suffix || ''}
        </span>
        <span className="stat-change stat-change-up">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          {change}
        </span>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ──────────────────
function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { fairnessEnabled, crisisActive } = useAppContext();
  const [selectedZone, setSelectedZone] = useState(null);
  const [auditLogs, setAuditLogs] = useState(mockAuditLogs);
  const [citizenRequests, setCitizenRequests] = useState(mockCitizenRequests);
  const [stats, setStats] = useState({
    total_resources: 2847,
    active_zones: 14,
    bias_score: 0.23,
    pending_requests: 156,
    estimated_impact: 94.2
  });
  const [realZones, setRealZones] = useState(staticKeralaZones);
  const [indiaZones, setIndiaZones] = useState([]);
  const [realStats, setRealStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const mapRef = useRef(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const getDisasterImage = (zone) => {
    if (!zone) return disasterFlood;
    if (zone.isKerala) return disasterFlood;
    const type = zone.disasterType || '';
    if (type.includes('Flood')) return disasterFlood;
    if (type.includes('Landslide') || type.includes('Earthquake')) return disasterLandslide;
    if (type.includes('Cyclone') || type.includes('Storm')) return disasterCyclone;
    return disasterFlood;
  };

  // Load Kerala zones (for stats) + India disaster zones (for map)
  useEffect(() => {
    getKeralaZones().then(zones => setRealZones(zones)).catch(console.error);
    getNationalStats().then(s => setRealStats(s)).catch(console.error);
    getIndiaDisasterZones().then(zones => setIndiaZones(zones)).catch(console.error);
  }, []);

  // Google Maps API loader
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // ── Firebase Real-time Listeners ────────────
  useEffect(() => {
    let unsubAudit = null;
    let unsubRequests = null;
    let unsubStats = null;

    try {
      // Audit log listener
      const auditQuery = query(
        collection(db, 'audit_log'),
        orderBy('timestamp', 'desc'),
        limit(7)
      );
      unsubAudit = onSnapshot(auditQuery, (snapshot) => {
        if (!snapshot.empty) {
          const logs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAuditLogs(logs);
        }
      }, (error) => {
        console.log('Using mock audit data:', error.message);
      });

      // Citizen requests listener
      const requestsQuery = query(
        collection(db, 'citizen_requests'),
        orderBy('timestamp', 'desc'),
        limit(3)
      );
      unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
        if (!snapshot.empty) {
          const requests = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCitizenRequests(requests);
        }
      }, (error) => {
        console.log('Using mock citizen requests:', error.message);
      });

      // Stats listener
      const statsDocRef = doc(db, 'stats', 'dashboard_stats');
      unsubStats = onSnapshot(statsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setStats(docSnap.data());
        }
      }, (error) => {
        console.log('Using mock stats data:', error.message);
      });

    } catch (err) {
      console.log('Firebase not configured, using mock data');
    }

    return () => {
      if (unsubAudit) unsubAudit();
      if (unsubRequests) unsubRequests();
      if (unsubStats) unsubStats();
    };
  }, []);

  // ── Priority / Status Helpers ───────────────
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'EN ROUTE': return 'status-enroute';
      case 'DEPLOYED': return 'status-deployed';
      case 'STANDBY': return 'status-standby';
      default: return '';
    }
  };

  const getAuditIcon = (type) => {
    switch (type) {
      case 'allocation': return '📦';
      case 'fairness': return '⚖️';
      case 'escalation': return '🔺';
      case 'request': return '🆘';
      case 'activation': return '🟢';
      case 'optimization': return '🤖';
      default: return '📋';
    }
  };

  // ── Map rendering ──────────────────────────
  const renderMap = () => {
    if (loadError) return renderMapFallback();
    if (!isLoaded) {
      return (
        <div className="map-loading">
          <div className="map-loading-spinner"></div>
          <span>Loading Tactical Map...</span>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>

        {/* Disaster Type Legend */}
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 10,
          background: 'rgba(5,10,20,0.82)', backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
          padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0AEC0', letterSpacing: '1px', marginBottom: '4px' }}>DISASTER TYPE</div>
          {[
            { color: '#1E90FF', label: 'Flood' },
            { color: '#FF6D00', label: 'Earthquake' },
            { color: '#9C27B0', label: 'Cyclone / Storm' },
            { color: '#FF8F00', label: 'Drought' },
            { color: '#E91E63', label: 'Epidemic' },
            { color: '#795548', label: 'Landslide' },
            { color: '#FF1744', label: 'Extreme Temp' },
          ].map(({ color, label }) => (
            <div
              key={label}
              onClick={() => setActiveFilter(f => f === label ? 'All' : label)}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer',
                opacity: activeFilter !== 'All' && activeFilter !== label ? 0.4 : 1, transition: 'opacity 0.2s' }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0,
                boxShadow: `0 0 6px ${color}` }} />
              <span style={{ fontSize: '11px', color: '#CBD5E0', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
          <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #FFFFFF', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#CBD5E0', fontWeight: 500 }}>🌊 Kerala 2018</span>
            </div>
          </div>
          <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontSize: '10px', color: '#A0AEC0' }}>
            Click to filter
          </div>
        </div>

        {/* Attribution Badge */}
        <div style={{
          position: 'absolute', bottom: '12px', left: '12px',
          backgroundColor: 'rgba(5, 10, 20, 0.7)', padding: '4px 10px',
          borderRadius: '4px', zIndex: 1, fontSize: '11px', color: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          Powered by Google Maps Platform
        </div>

        <GoogleMap
          mapContainerClassName="google-map-container"
          center={{ lat: 20.5937, lng: 78.9629 }}
          zoom={5}
          onLoad={onMapLoad}
          options={{
            styles: darkMapStyle,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            backgroundColor: '#050A14',
            gestureHandling: 'cooperative',
          }}
          onClick={() => setSelectedZone(null)}
        >
          {/* India-wide disaster zones from disasterIND.csv */}
          {indiaZones
            .filter(z => activeFilter === 'All' || z.disasterType?.toLowerCase().includes(activeFilter.toLowerCase().split(' /')[0]))
            .map((zone) => (
            <CircleF
              key={zone.id}
              center={{ lat: zone.lat, lng: zone.lng }}
              radius={zone.severity === 'CRITICAL' ? 120000 : zone.severity === 'HIGH' ? 90000 : 60000}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.18,
                strokeColor: zone.color,
                strokeOpacity: 0.7,
                strokeWeight: 1.5,
                clickable: true,
              }}
              onClick={() => setSelectedZone(zone)}
            />
          ))}

          {/* Inner brighter circles sized by severity */}
          {indiaZones
            .filter(z => activeFilter === 'All' || z.disasterType?.toLowerCase().includes(activeFilter.toLowerCase().split(' /')[0]))
            .map((zone) => (
            <CircleF
              key={`inner-${zone.id}`}
              center={{ lat: zone.lat, lng: zone.lng }}
              radius={Math.max(15000, (zone.severityScore / 100) * 60000)}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.55,
                strokeColor: zone.color,
                strokeOpacity: 1,
                strokeWeight: 1,
                clickable: true,
              }}
              onClick={() => setSelectedZone({ ...zone, isKerala: true })}
            />
          ))}

          {/* ── Kerala District Zones (white-outlined — smaller detail layer) ── */}
          {realZones.map((zone) => (
            <CircleF
              key={`kerala-outer-${zone.id}`}
              center={{ lat: zone.lat, lng: zone.lng }}
              radius={22000}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.15,
                strokeColor: '#FFFFFF',
                strokeOpacity: 0.6,
                strokeWeight: 1.5,
                clickable: true,
              }}
              onClick={() => setSelectedZone({ ...zone, isKerala: true })}
            />
          ))}
          {realZones.map((zone) => (
            <CircleF
              key={`kerala-inner-${zone.id}`}
              center={{ lat: zone.lat, lng: zone.lng }}
              radius={Math.max(4000, (zone.severityScore / 100) * 12000)}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.75,
                strokeColor: zone.color,
                strokeOpacity: 1,
                strokeWeight: 1,
                clickable: true,
              }}
              onClick={() => setSelectedZone({ ...zone, isKerala: true })}
            />
          ))}

          {selectedZone && (
            <InfoWindowF
              position={{ lat: selectedZone.lat, lng: selectedZone.lng }}
              onCloseClick={() => setSelectedZone(null)}
              options={{ maxWidth: 320 }}
            >
              <div className="dark-info-window">
                <div className="diw-image-header" style={{ width: 'calc(100% + 24px)', margin: '-12px -12px 12px -12px', height: '140px', overflow: 'hidden', position: 'relative' }}>
                  <img src={getDisasterImage(selectedZone)} alt="Disaster Area" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, #0D1B2A, transparent)' }}></div>
                </div>

                <h3 className="diw-title">{selectedZone.name}</h3>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span
                    className="diw-severity-pill"
                    style={{
                      backgroundColor: `${selectedZone.color}22`,
                      color: selectedZone.color,
                      border: `1px solid ${selectedZone.color}55`
                    }}
                  >
                    {selectedZone.severity}
                  </span>
                  {selectedZone.isKerala && (
                    <span style={{ background: 'rgba(255,255,255,0.1)', color: '#A0AEC0', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      🌊 Kerala 2018
                    </span>
                  )}
                  {!selectedZone.isKerala && selectedZone.disasterType && (
                    <span style={{ background: `${selectedZone.color}18`, color: selectedZone.color, fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      {selectedZone.disasterType}
                    </span>
                  )}
                </div>

                <div className="diw-stats">
                  {selectedZone.isKerala ? (
                    // ── Kerala zone details ──
                    <>
                      <div className="diw-row">
                        <span className="diw-label">Fatalities:</span>
                        <span className="diw-value">{(selectedZone.fatalities || 0).toLocaleString()}</span>
                      </div>
                      <div className="diw-row">
                        <span className="diw-label">Relief Camps:</span>
                        <span className="diw-value">{(selectedZone.reliefCamps || 0).toLocaleString()}</span>
                      </div>
                      <div className="diw-row">
                        <span className="diw-label">Houses Damaged:</span>
                        <span className="diw-value">{(selectedZone.housesAffected || 0).toLocaleString()}</span>
                      </div>
                      <div className="diw-row">
                        <span className="diw-label">Landslides:</span>
                        <span className="diw-value">{selectedZone.landslides || 0}</span>
                      </div>
                    </>
                  ) : (
                    // ── India disaster zone details ──
                    <>
                      <div className="diw-row">
                        <span className="diw-label">Deaths:</span>
                        <span className="diw-value">{(selectedZone.deaths || 0).toLocaleString()}</span>
                      </div>
                      <div className="diw-row">
                        <span className="diw-label">Affected:</span>
                        <span className="diw-value">{(selectedZone.affected || 0).toLocaleString()}</span>
                      </div>
                      {selectedZone.year && (
                        <div className="diw-row">
                          <span className="diw-label">Latest Year:</span>
                          <span className="diw-value">{selectedZone.year}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="diw-row">
                    <span className="diw-label">Severity Score:</span>
                    <span className="diw-value">{(selectedZone.severityScore || 0).toFixed(1)} / 100</span>
                  </div>
                </div>
                <a className="diw-link" href="#" onClick={(e) => { e.preventDefault(); setDetailModalOpen(true); }}>
                  {t('viewDetails')} →
                </a>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>
    );
  };

  // ── Map Fallback (no API key) ───────────────
  const renderMapFallback = () => (
    <div className="map-fallback" style={{ 
      position: 'relative', 
      overflow: 'hidden',
      backgroundImage: `linear-gradient(rgba(5, 10, 20, 0.8), rgba(5, 10, 20, 0.8)), url(${indiaMapImg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="map-fallback-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Tactical Preview — National Disaster Zones</span>
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
         <img src={indiaMapImg} alt="India Map" style={{ maxWidth: '80%', maxHeight: '80%', opacity: 0.4, filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.2))' }} />
         <div className="map-fallback-grid" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'transparent', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', overflowY: 'auto' }}>
            {indiaZones.slice(0, 15).map((zone) => (
              <div key={zone.id} className="zone-card-mini" style={{ borderColor: zone.color, background: 'rgba(5, 10, 20, 0.8)', backdropFilter: 'blur(4px)' }}>
                <div className="zone-dot" style={{ background: zone.color, boxShadow: `0 0 8px ${zone.color}` }}></div>
                <div className="zone-card-info">
                  <span className="zone-name">{zone.name}</span>
                  <span className={`zone-severity ${getPriorityClass(zone.severity)}`}>{zone.severity}</span>
                </div>
                <span className="zone-resources" style={{ fontSize: '9px', opacity: 0.7 }}>{zone.disasterType}</span>
              </div>
            ))}
         </div>
      </div>

      <p className="map-fallback-note" style={{ background: 'rgba(0,0,0,0.6)', margin: 0, padding: '10px' }}>
        Interactive map requires <code>VITE_GOOGLE_MAPS_API_KEY</code>. Showing tactical static preview.
      </p>
    </div>
  );

  return (
    <div className="dashboard">
      {/* ── TOP STATS BAR ── */}
      <div className="stats-row">
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          }
          label={t('totalFatalities')}
          value={realStats ? realStats.totalFatalities : stats.total_resources}
          decimals={0}
          change={realStats ? `${t('mostAffected')}: ${realStats.mostAffectedDistrict}` : `+12.3% ${t('vsLastHour')}`}
          glowColor="#FF1744"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          label={t('housesAffected')}
          value={realStats ? realStats.totalHousesAffected : 8926}
          decimals={0}
          change={t('floodData')}
          glowColor="#FF4500"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18" />
              <path d="M5 6l7-3 7 3" />
              <circle cx="5" cy="14" r="2" />
              <circle cx="19" cy="14" r="2" />
            </svg>
          }
          label={t('biasScore')}
          value={fairnessEnabled ? stats.bias_score : 0.71}
          decimals={2}
          change={fairnessEnabled ? `-67.6% ${t('improved')}` : `0.0% ${t('improved')}`}
          glowColor={fairnessEnabled ? "#00FF88" : "#FF1744"}
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.59 4.4 2 2 0 0 1 3.55 2h3a2 2 0 0 1 2 1.72" />
            </svg>
          }
          label={t('reliefCamps')}
          value={realStats ? realStats.totalReliefCamps : stats.pending_requests}
          decimals={0}
          change={t('activeDistricts')}
          glowColor="#FFB800"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
          label={t('estimatedImpact')}
          value={stats.estimated_impact}
          decimals={1}
          suffix="%"
          change={`+3.1% ${t('efficiency')}`}
          glowColor="#00D4FF"
        />
      </div>
      {/* Data source attribution */}
      <div style={{ textAlign: 'center', color: '#4a6380', fontSize: '11px', marginTop: '-8px', marginBottom: '4px' }}>
        {t('dataSource')}
        {isUsingFallback() && <span style={{ color: '#FFB800', marginLeft: '8px' }}>⚠ Using cached data — CSV files not found in /data folder</span>}
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="dashboard-grid">
        {/* ── LEFT: Tactical Map ── */}
        <div className="panel-tactical">
          <div className="panel-header">
            <h2>
              {t('tacticalOverview')}
            </h2>
            {crisisActive ? (
              <div className="live-indicator">
                <span className="live-dot"></span>
                {t('live')}
              </div>
            ) : (
              <div className="live-indicator" style={{ color: '#888' }}>
                <span className="live-dot" style={{ background: '#888', boxShadow: 'none' }}></span>
                Offline
              </div>
            )}
          </div>

          <div className="map-wrapper" style={{ position: 'relative' }}>
            {renderMap()}
            <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none', zIndex: 10 }}>
              Powered by Google Maps Platform
            </div>
          </div>
          
          {/* Weather Summary Widget */}
          <div 
            style={{
              background: 'rgba(15, 118, 110, 0.2)',
              border: '1px solid rgba(20, 184, 166, 0.4)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => navigate('/resource-map', { state: { enableWeather: true } })}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(15, 118, 110, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 118, 110, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.4)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🌧</span>
              <span style={{ color: '#E2E8F0', fontWeight: '600', fontSize: '13px' }}>
                Weather Monitor — 3 zones high risk
              </span>
            </div>
            <span style={{ color: '#2DD4BF', fontSize: '12px', fontWeight: 'bold' }}>View Layer →</span>
          </div>

          <button 
            className="btn-expand" 
            id="btn-expand-tactical"
            style={{ marginTop: '12px' }}
            onClick={() => navigate('/resource-map')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            {t('expandTacticalView')}
          </button>
        </div>

        {/* ── RIGHT PANELS ── */}
        <div className="panel-right-stack">
          {/* Fairness Summary */}
          <div className="crisis-card panel-fairness">
            <div className="fairness-header">
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" /><path d="M5 6l7-3 7 3" /><path d="M2 12h4l1-4 1 4H2z" /><path d="M16 12h4l1-4 1 4h-6z" />
                <circle cx="4" cy="14" r="2" /><circle cx="20" cy="14" r="2" />
              </svg>
              <h3>{t('fairnessSummary')}</h3>
            </div>
            <div className="ai-google-badge" title="AI optimized by Google Cloud Vertex AI">
              <span className="google-letter g-blue">G</span>
              <span className="google-letter o-red">o</span>
              <span className="google-letter o-yellow">o</span>
              <span className="google-letter g-blue">g</span>
              <span className="google-letter l-green">l</span>
              <span className="google-letter e-red">e</span>
              <span className="google-ai-text">Cloud AI</span>
            </div>
          </div>

            <div className="fairness-bars">
              <div className="fairness-row">
                <span className="fairness-label">{t('beforeAllocation')}</span>
                <div className="fairness-bar-track">
                  <div className="fairness-bar-fill fairness-bar-before" style={{ width: '71%' }}></div>
                </div>
                <span className="fairness-score fairness-score-bad">0.71</span>
              </div>
              <div className="fairness-row">
                <span className="fairness-label">{t('afterAllocation')}</span>
                <div className="fairness-bar-track">
                  <div className="fairness-bar-fill fairness-bar-after" style={{ width: fairnessEnabled ? '23%' : '71%', background: fairnessEnabled ? '#1D9E75' : '#E24B4A' }}></div>
                </div>
                <span className={`fairness-score ${fairnessEnabled ? 'fairness-score-good' : 'fairness-score-bad'}`}>{fairnessEnabled ? '0.23' : '0.71'}</span>
              </div>
            </div>
            <div className="fairness-result">
              <span style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: '#E1F5EE', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              {t('biasReducedBy')} <strong>{fairnessEnabled ? '67.6%' : '0.0%'}</strong>
            </div>
            <button 
              className="btn-expand" 
              style={{ marginTop: '12px', width: '100%' }}
              onClick={() => navigate('/fairness-analytics')}
            >
              {t('fullFairnessReport') || 'Full Fairness Report'} →
            </button>
          </div>

          {/* Transparency Audit Feed */}
          <div className="crisis-card panel-audit">
            <div className="panel-header">
              <h2>
                {t('transparencyAudit')}
              </h2>
              {crisisActive ? (
                <div className="live-indicator">
                  <span className="live-dot"></span>
                  {t('live')}
                </div>
              ) : (
                <div className="live-indicator" style={{ color: '#888' }}>
                  <span className="live-dot" style={{ background: '#888', boxShadow: 'none' }}></span>
                  Offline
                </div>
              )}
            </div>

            <div className="audit-feed">
              {auditLogs.map((log, idx) => (
                <div key={log.id || idx} className="audit-item" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <span className="audit-icon">{getAuditIcon(log.type)}</span>
                  <div className="audit-content">
                    <span className="audit-action">{t(auditActionKeyMap[log.action] || log.actionKey || log.action)}</span>
                    <span className="audit-zone">{log.zone}</span>
                  </div>
                  <span className="audit-time">{log.timestamp}</span>
                </div>
              ))}
            </div>
            <button 
              className="btn-expand" 
              style={{ marginTop: '12px', width: '100%' }}
              onClick={() => navigate('/transparency-log')}
            >
              {t('viewDetailedLog') || 'View Detailed Log'} →
            </button>
          </div>

          {/* Citizen Requests */}
          <div className="crisis-card panel-citizen">
            <div className="panel-header">
              <h2>
                {t('citizenRequests')}
              </h2>
              <span className="panel-count">{citizenRequests.length} {t('recent')}</span>
            </div>

            <div className="citizen-feed">
              {citizenRequests.map((req, idx) => (
                <div key={req.id || idx} className="citizen-item">
                  <div className="citizen-avatar" style={{
                    background: req.priority === 'CRITICAL' ? 'rgba(255,23,68,0.2)' :
                      req.priority === 'HIGH' ? 'rgba(255,107,0,0.2)' : 'rgba(255,184,0,0.2)',
                    color: req.priority === 'CRITICAL' ? '#FF1744' :
                      req.priority === 'HIGH' ? '#FF6D00' : '#FFB800',
                  }}>
                    {req.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="citizen-info">
                    <span className="citizen-name">{req.name}</span>
                    <span className="citizen-location">{req.location}</span>
                  </div>
                  <div className="citizen-meta">
                    <span className={`priority-badge ${getPriorityClass(req.priority)}`}>
                      {t(req.priority.toLowerCase()) || req.priority}
                    </span>
                    <span className="citizen-time">{req.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <button 
              className="btn-expand" 
              style={{ marginTop: '12px', width: '100%' }}
              onClick={() => navigate('/citizen-requests')}
            >
              {t('viewAllRequests') || 'View All Requests'} →
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Live Allocation Feed ── */}
      <div className="crisis-card panel-allocation">
        <div className="panel-header">
          <h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
              <path d="M16 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
              <line x1="8" y1="12" x2="8" y2="12" />
            </svg>
            {t('liveAuditStream')}
          </h2>
          {crisisActive ? (
            <div className="live-indicator">
              <span className="live-dot"></span>
              {t('live')}
            </div>
          ) : (
            <div className="live-indicator" style={{ color: '#888' }}>
              <span className="live-dot" style={{ background: '#888', boxShadow: 'none' }}></span>
              Offline
            </div>
          )}
        </div>

        <div className="allocation-table-wrapper">
          <table className="allocation-table">
            <thead>
              <tr>
                <th>{t('resourceId')}</th>
                <th>{t('type')}</th>
                <th>{t('district')}</th>
                <th>{t('severity')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {allocationData.map((row, idx) => (
                <tr key={row.id} style={{ animationDelay: `${idx * 0.06}s` }}>
                  <td className="td-id">{row.id}</td>
                  <td>{t(resourceTypeKeyMap[row.type] || row.type)}</td>
                  <td>{row.district}</td>
                  <td>
                    <span className={`priority-badge ${getPriorityClass(row.priority)}`}>
                      {t(row.priority.toLowerCase()) || row.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(row.status)}`}>
                      {t(statusKeyMap[row.status] || row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            className="btn-expand" 
            style={{ minWidth: '240px' }}
            onClick={() => navigate('/allocation-engine')}
          >
            {t('expandAllocationView') || 'Expand Allocation View'}
          </button>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {detailModalOpen && selectedZone && (
        <div className="zone-detail-overlay animate-fade-in" onClick={() => setDetailModalOpen(false)}>
          <div className="zone-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailModalOpen(false)}>&times;</button>
            
            <div className="modal-image-wrapper">
              <img src={getDisasterImage(selectedZone)} alt={selectedZone.name} />
              <div className="modal-image-overlay">
                <div className="modal-header-content">
                  <span className={`modal-severity-badge ${getPriorityClass(selectedZone.severity)}`}>
                    {selectedZone.severity}
                  </span>
                  <h2>{selectedZone.name}</h2>
                  <p>{selectedZone.isKerala ? 'Kerala Flood Relief Operations 2018' : `${selectedZone.disasterType || 'Disaster'} Response Zone`}</p>
                </div>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-stats-grid">
                {selectedZone.isKerala ? (
                  <>
                    <div className="modal-stat-box">
                      <label>Fatalities</label>
                      <span>{selectedZone.fatalities?.toLocaleString() || 0}</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Relief Camps</label>
                      <span>{selectedZone.reliefCamps?.toLocaleString() || 0}</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Houses Damaged</label>
                      <span>{selectedZone.housesAffected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Landslides</label>
                      <span>{selectedZone.landslides || 0}</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Rainfall Deviation</label>
                      <span>+{selectedZone.rainfallDeviation || 0} mm</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Severity Index</label>
                      <span>{selectedZone.severityScore?.toFixed(1) || 0}/100</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="modal-stat-box">
                      <label>Deaths (Historic)</label>
                      <span>{selectedZone.deaths?.toLocaleString() || 0}</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>People Affected</label>
                      <span>{selectedZone.affected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Event Year</label>
                      <span>{selectedZone.year || 'N/A'}</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Disaster Type</label>
                      <span>{selectedZone.disasterType || 'General'}</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Severity Score</label>
                      <span>{selectedZone.severityScore?.toFixed(1) || 0}/100</span>
                    </div>
                    <div className="modal-stat-box">
                      <label>Response Status</label>
                      <span style={{ color: '#00FF88' }}>ACTIVE</span>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn-modal-action primary" onClick={() => { setDetailModalOpen(false); navigate('/resource-map'); }}>
                  Track Resource Deployment
                </button>
                <button className="btn-modal-action secondary" onClick={() => setDetailModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(Dashboard);
