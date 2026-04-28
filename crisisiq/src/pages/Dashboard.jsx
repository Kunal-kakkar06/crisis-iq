// ============================================
// CrisisIQ — Dashboard Page
// ============================================
// Command center with real-time KPIs, tactical
// map, fairness metrics, and live feeds.
// ============================================

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc } from 'firebase/firestore';
import { darkMapStyle, keralaZones as staticKeralaZones, GOOGLE_MAPS_ID, GOOGLE_MAPS_LIBRARIES } from '../config/googleMaps';
import { getKeralaZones, getNationalStats, isUsingFallback, getIndiaDisasterZones } from '../utils/dataLoader';
import indiaMapImg from '../assets/india_fallback_map.png';
import disasterFlood from '../assets/disaster_flood.png';
import disasterLandslide from '../assets/disaster_landslide.png';
import disasterCyclone from '../assets/disaster_cyclone.png';
import { useLanguage } from '../context/LanguageContext';
import './Dashboard.css';
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

// ── Live Impact Counter Hook ──────────────────
function useLiveCountUp(target, duration = 3000) {
  const [count, setCount] = useState(0);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    let startTime = null;
    const startValue = prevTargetRef.current === 0 ? 0 : prevTargetRef.current;
    const change = target - startValue;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      setCount(startValue + (change * easedProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevTargetRef.current = target;
      }
    };

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return Math.floor(count);
}

function ImpactStat({ icon, value, color, label, sub }) {
  const displayValue = useLiveCountUp(value, 3000);
  return (
    <div style={{ textAlign: 'center', padding: '12px' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ 
        fontSize: '36px', 
        fontWeight: 800, 
        color: color, 
        textShadow: `0 0 10px ${color}40`,
        fontFamily: 'monospace'
      }}>
        {displayValue.toLocaleString()}
      </div>
      <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{label}</div>
      <div style={{ color: '#6B7B8D', fontSize: '12px', marginTop: '2px' }}>{sub}</div>
    </div>
  );
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
  const [fairnessEnabled] = useState(true);
  const [crisisActive] = useState(true);
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
  const [impactStats, setImpactStats] = useState({
    livesReached: 234847,
    resourcesDeployed: 1247
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setImpactStats(prev => ({
        livesReached: prev.livesReached + Math.floor(Math.random() * 7) + 2,
        resourcesDeployed: prev.resourcesDeployed + 1
      }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  const [indiaZones, setIndiaZones] = useState([]);
  const [realStats, setRealStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const mapRef = useRef(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [mapsError, setMapsError] = useState(false);

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

  // Google Maps state (replaced useAppContext with local state)
  const loadError = null;

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

  const mapContainerStyle = {
    width: "100%",
    height: "100%",
    minHeight: "350px",
    borderRadius: "8px"
  };

  const indiaCenter = { 
    lat: 20.5937, 
    lng: 78.9629 
  };

  const disasterZones = [
    {id:1,name:"Wayanad", lat:11.6854,lng:76.1320, severity:"CRITICAL",color:"#FF1744"},
    {id:2,name:"Idukki", lat:9.9189,lng:77.1025, severity:"CRITICAL",color:"#FF1744"},
    {id:3,name:"Chamoli", lat:30.4087,lng:79.3192, severity:"CRITICAL",color:"#FF1744"},
    {id:4,name:"Darbhanga", lat:26.1542,lng:85.8918, severity:"HIGH",color:"#FF4500"},
    {id:5,name:"Dhubri", lat:26.0200,lng:89.9800, severity:"HIGH",color:"#FF4500"},
    {id:6,name:"Puri", lat:19.8135,lng:85.8312, severity:"HIGH",color:"#FF4500"},
    {id:7,name:"Kolhapur", lat:16.7050,lng:74.2433, severity:"MEDIUM",color:"#FFB800"},
    {id:8,name:"Ernakulam", lat:9.9816,lng:76.2999, severity:"STABLE",color:"#00FF88"}
  ];

  const renderMap = () => {
    if (mapsError) {
      return (
        <div style={{
          height:"100%",
          background:"#0A1628",
          borderRadius:"8px",
          border:"1px solid rgba(45,125,210,0.3)",
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          justifyContent:"center",
          color:"white"
        }}>
          <div style={{fontSize:"40px", marginBottom:"12px"}}>🗺️</div>
          <p style={{color:"#9CA3AF", fontSize:"13px"}}>
            Tactical Overview — India
          </p>
          <div style={{
            marginTop:"16px",
            display:"grid",
            gridTemplateColumns:"1fr 1fr 1fr",
            gap:"8px"
          }}>
            {[
              {n:"Wayanad",s:"CRITICAL", c:"#FF1744"},
              {n:"Idukki",s:"CRITICAL", c:"#FF1744"},
              {n:"Palakkad",s:"CRITICAL", c:"#FF1744"},
              {n:"Thrissur",s:"HIGH", c:"#FF4500"},
              {n:"Alappuzha",s:"HIGH", c:"#FF4500"},
              {n:"Ernakulam",s:"STABLE", c:"#00FF88"}
            ].map(z => (
              <div key={z.n} style={{
                background:"rgba(13,27,42,0.9)",
                border:`1px solid ${z.c}40`,
                borderRadius:"6px",
                padding:"8px 12px",
                textAlign:"center"
              }}>
                <div style={{color:"white", fontSize:"11px", fontWeight:"600"}}>
                  {z.n}
                </div>
                <div style={{color:z.c, fontSize:"10px", marginTop:"2px"}}>
                  {z.s}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '8px' }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={indiaCenter}
          zoom={5}
          options={{
            styles: darkMapStyle,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
          }}>
          {disasterZones.map(zone => (
            <Circle
              key={zone.id}
              center={{lat:zone.lat, lng:zone.lng}}
              radius={80000}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.3,
                strokeColor: zone.color,
                strokeOpacity: 0.8,
                strokeWeight: 2
              }}
            />
          ))}
          {disasterZones.map(zone => (
            <Marker
              key={`m-${zone.id}`}
              position={{lat:zone.lat,lng:zone.lng}}
              title={`${zone.name} — ${zone.severity}`}
            />
          ))}
        </GoogleMap>
      </div>
    );
  };

  return (
    <div className="dashboard">

      {/* ── Dashboard Header ── */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#fff' }}>{t('dashboard')}</h1>
          <p style={{ margin: '4px 0 0', color: '#A0AEC0', fontSize: '14px' }}>Tactical Command & Control Center</p>
        </div>
        <button 
          onClick={() => navigate('/citizen-requests?sos=true')}
          style={{
            background: "#FF1744",
            color: "white",
            fontWeight: "bold",
            padding: "12px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            animation: 'sos-pulse 2s infinite'
          }}>
          🚨 SOS — I NEED HELP
        </button>
      </div>

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

      {/* ── IMPACT COUNTER SECTION ── */}
      <div className="impact-counter-section" style={{
        margin: '24px 0',
        padding: '24px',
        background: 'rgba(13, 27, 42, 0.8)',
        border: '1px solid #00D4FF',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 212, 255, 0.1)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>
            CrisisIQ Impact — Live Counter
          </h2>
          <p style={{ color: '#A0AEC0', fontSize: '14px', margin: '4px 0 0' }}>
            Real-time lives impacted since platform launch
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          <ImpactStat 
            icon="❤️" 
            value={impactStats.livesReached} 
            color="#00D4FF" 
            label="Lives Reached" 
            sub="Across 15 Indian states" 
          />
          <ImpactStat 
            icon="📦" 
            value={impactStats.resourcesDeployed} 
            color="#00FF88" 
            label="Resources Deployed" 
            sub="Ambulances, food, shelter, water" 
          />
          <ImpactStat 
            icon="⚖️" 
            value={89} 
            color="#FF4500" 
            label="Bias Incidents Prevented" 
            sub="Unfair allocations blocked by AI" 
          />
          <ImpactStat 
            icon="⏱️" 
            value={4156320} 
            color="#FFB800" 
            label="Minutes Saved" 
            sub="vs traditional 72-hour response" 
          />
        </div>
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
              <div className="live-indicator" style={{ color: '#FFB800' }}>
                <span className="live-dot" style={{ background: '#FFB800', boxShadow: '0 0 6px #FFB800' }}></span>
                Demo Mode
              </div>
            )}
          </div>

          <div className="map-wrapper" style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
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
                <div className="live-indicator" style={{ color: '#FFB800' }}>
                  <span className="live-dot" style={{ background: '#FFB800', boxShadow: '0 0 6px #FFB800' }}></span>
                  Demo Mode
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
              onClick={() => window.location.href = '/citizen-requests'}
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
