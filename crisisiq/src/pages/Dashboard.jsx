// ============================================
// CrisisIQ — Dashboard Page
// ============================================
// Command center with real-time KPIs, tactical
// map, fairness metrics, and live feeds.
// ============================================

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { GoogleMap, useJsApiLoader, CircleF, InfoWindowF } from '@react-google-maps/api';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc } from 'firebase/firestore';
import { darkMapStyle, keralaZones, GOOGLE_MAPS_ID } from '../config/googleMaps';
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
        setCount(target);
      } else {
        setCount(parseFloat(current.toFixed(decimals)));
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
  const mapRef = useRef(null);

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
          center={{ lat: 10.8505, lng: 76.2711 }}
          zoom={7}
          onLoad={onMapLoad}
          options={{
            styles: darkMapStyle,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            backgroundColor: '#050A14',
          }}
          onClick={() => setSelectedZone(null)}
        >
          {keralaZones.map((zone) => (
            <CircleF
              key={zone.id}
              center={{ lat: zone.lat, lng: zone.lng }}
              radius={zone.severity === 'CRITICAL' ? 18000 : zone.severity === 'HIGH' ? 14000 : 10000}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.25,
                strokeColor: zone.color,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                clickable: true,
              }}
              onClick={() => setSelectedZone(zone)}
            />
          ))}

          {/* Inner brighter circles */}
          {keralaZones.map((zone) => (
            <CircleF
              key={`inner-${zone.id}`}
              center={{ lat: zone.lat, lng: zone.lng }}
              radius={4000}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.6,
                strokeColor: zone.color,
                strokeOpacity: 1,
                strokeWeight: 1,
                clickable: true,
              }}
              onClick={() => setSelectedZone(zone)}
            />
          ))}

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
                  {selectedZone.severity}
                </span>
                <div className="diw-stats">
                  <div className="diw-row">
                    <span className="diw-label">Resources:</span>
                    <span className="diw-value">{selectedZone.resources} available</span>
                  </div>
                  <div className="diw-row">
                    <span className="diw-label">Affected:</span>
                    <span className="diw-value">{selectedZone.affected?.toLocaleString() || selectedZone.population?.toLocaleString()} people</span>
                  </div>
                  <div className="diw-row">
                    <span className="diw-label">Severity Score:</span>
                    <span className="diw-value">{selectedZone.severityScore?.toFixed(1) || (selectedZone.score * 10).toFixed(1)} / 100</span>
                  </div>
                  <div className="diw-row">
                    <span className="diw-label">Last updated:</span>
                    <span className="diw-value">{selectedZone.lastUpdated}</span>
                  </div>
                </div>
                <a className="diw-link" href="#" onClick={(e) => e.preventDefault()}>
                  View Details →
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
    <div className="map-fallback">
      <div className="map-fallback-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Tactical Map — Kerala Zones</span>
      </div>
      <div className="map-fallback-grid">
        {keralaZones.map((zone) => (
          <div key={zone.id} className="zone-card-mini" style={{ borderColor: zone.color }}>
            <div className="zone-dot" style={{ background: zone.color, boxShadow: `0 0 8px ${zone.color}` }}></div>
            <div className="zone-card-info">
              <span className="zone-name">{zone.name}</span>
              <span className={`zone-severity ${getPriorityClass(zone.severity)}`}>{zone.severity}</span>
            </div>
            <span className="zone-resources">{zone.resources} units</span>
          </div>
        ))}
      </div>
      <p className="map-fallback-note">
        Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> to enable the interactive map.
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
          label="Total Resources"
          value={stats.total_resources}
          decimals={0}
          change="+12.3% vs last hour"
          glowColor="#00D4FF"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
          label="Active Zones"
          value={stats.active_zones}
          decimals={0}
          change="+2 zones this hour"
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
          label="Bias Score"
          value={stats.bias_score}
          decimals={2}
          change="-67.6% improved"
          glowColor="#00FF88"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          label="Pending Requests"
          value={stats.pending_requests}
          decimals={0}
          change="-8 from last hour"
          glowColor="#FFB800"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
          label="Estimated Impact"
          value={stats.estimated_impact}
          decimals={1}
          suffix="%"
          change="+3.1% efficiency"
          glowColor="#00D4FF"
        />
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="dashboard-grid">
        {/* ── LEFT: Tactical Map ── */}
        <div className="panel-tactical">
          <div className="panel-header">
            <h2>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Tactical Overview — Kerala
            </h2>
            <div className="live-indicator">
              <span className="live-dot"></span>
              LIVE
            </div>
          </div>

          <div className="map-wrapper" style={{ position: 'relative' }}>
            {renderMap()}
            <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none', zIndex: 10 }}>
              Powered by Google Maps Platform
            </div>
          </div>

          <button className="btn-expand" id="btn-expand-tactical">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            Expand Tactical View
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
              <h3>Fairness Summary</h3>
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
                <span className="fairness-label">Before Allocation</span>
                <div className="fairness-bar-track">
                  <div className="fairness-bar-fill fairness-bar-before" style={{ width: '71%' }}></div>
                </div>
                <span className="fairness-score fairness-score-bad">0.71</span>
              </div>
              <div className="fairness-row">
                <span className="fairness-label">After Allocation</span>
                <div className="fairness-bar-track">
                  <div className="fairness-bar-fill fairness-bar-after" style={{ width: '23%' }}></div>
                </div>
                <span className="fairness-score fairness-score-good">0.23</span>
              </div>
            </div>
            <div className="fairness-result">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Bias reduced by <strong>67.6%</strong>
            </div>
          </div>

          {/* Transparency Audit Feed */}
          <div className="crisis-card panel-audit">
            <div className="panel-header">
              <h2>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Transparency Audit
              </h2>
              <div className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </div>
            </div>

            <div className="audit-feed">
              {auditLogs.map((log, idx) => (
                <div key={log.id || idx} className="audit-item" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <span className="audit-icon">{getAuditIcon(log.type)}</span>
                  <div className="audit-content">
                    <span className="audit-action">{log.action}</span>
                    <span className="audit-zone">{log.zone}</span>
                  </div>
                  <span className="audit-time">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Citizen Requests */}
          <div className="crisis-card panel-citizen">
            <div className="panel-header">
              <h2>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB800" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                Citizen Requests
              </h2>
              <span className="panel-count">{citizenRequests.length} recent</span>
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
                      {req.priority}
                    </span>
                    <span className="citizen-time">{req.time}</span>
                  </div>
                </div>
              ))}
            </div>
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
            Live Allocation Feed
          </h2>
          <div className="live-indicator">
            <span className="live-dot"></span>
            LIVE
          </div>
        </div>

        <div className="allocation-table-wrapper">
          <table className="allocation-table">
            <thead>
              <tr>
                <th>Resource ID</th>
                <th>Type</th>
                <th>District</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allocationData.map((row, idx) => (
                <tr key={row.id} style={{ animationDelay: `${idx * 0.06}s` }}>
                  <td className="td-id">{row.id}</td>
                  <td>{row.type}</td>
                  <td>{row.district}</td>
                  <td>
                    <span className={`priority-badge ${getPriorityClass(row.priority)}`}>
                      {row.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default memo(Dashboard);
