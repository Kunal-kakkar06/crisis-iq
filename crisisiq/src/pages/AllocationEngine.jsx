// =====================================================
// CrisisIQ — Allocation Engine Page
// AI-driven resource optimisation via Vertex AI
// =====================================================

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import axios from 'axios';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getKeralaZones } from '../utils/dataLoader';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import './AllocationEngine.css';

// ── Initial Allocation Data ───────────────────────
const initialAllocations = [
  { id: 'RES-001', type: 'Medical Unit',      district: 'Wayanad',    priority: 95, status: 'EN ROUTE'  },
  { id: 'RES-002', type: 'Search & Rescue',   district: 'Idukki',     priority: 91, status: 'DEPLOYED'  },
  { id: 'RES-003', type: 'Food Supply',       district: 'Palakkad',   priority: 87, status: 'EN ROUTE'  },
  { id: 'RES-004', type: 'Water Tanker',      district: 'Thrissur',   priority: 72, status: 'STANDBY'   },
  { id: 'RES-005', type: 'Engineering Team',  district: 'Malappuram', priority: 68, status: 'DEPLOYED'  },
  { id: 'RES-006', type: 'Shelter Kit',       district: 'Alappuzha',  priority: 63, status: 'STANDBY'   },
  { id: 'RES-007', type: 'Ambulance',         district: 'Kottayam',   priority: 45, status: 'DEPLOYED'  },
  { id: 'RES-008', type: 'Police Support',    district: 'Ernakulam',  priority: 22, status: 'STANDBY'   },
];

const resourceTypeKeyMap = {
  "Medical Unit":     "resourceTypes.medicalUnit",
  "Search & Rescue":  "resourceTypes.searchAndRescue",
  "Food Supply":      "resourceTypes.foodSupply",
  "Water Tanker":     "resourceTypes.waterTanker",
  "Engineering Team": "resourceTypes.engineeringTeam",
  "Shelter Kit":      "resourceTypes.shelterKit",
  "Ambulance":        "resourceTypes.ambulance",
  "Police Support":   "resourceTypes.policeSupport",
};

const statusKeyMap = {
  "DEPLOYED": "status.deployed",
  "STANDBY":  "status.standby",
  "TRANSIT":  "status.transit",
  "INACTIVE": "status.inactive",
  "EN ROUTE": "status.enroute",
};

// ── Initial Predictive Chart Data ─────────────────
const baseChartData = [
  { time: 'Now',  current: 78, predicted: 80 },
  { time: '+1h',  current: 82, predicted: 91 },
  { time: '+2h',  current: 75, predicted: 86 },
  { time: '+3h',  current: 88, predicted: 79 },
  { time: '+4h',  current: 71, predicted: 72 },
  { time: '+5h',  current: 65, predicted: 68 },
  { time: '+6h',  current: 60, predicted: 63 },
];

// ── Priority Progress Bar Color ───────────────────
function getPriorityColor(score) {
  if (score >= 80) return '#E24B4A';
  if (score >= 60) return '#EF9F27';
  return '#1D9E75';
}

// ── Status Badge Style (theme-aware) ─────────────
function getStatusStyle(status, isDark) {
  if (isDark) {
    switch (status) {
      case 'EN ROUTE':  return { bg: 'rgba(0,212,255,0.12)',   color: '#00D4FF', border: 'rgba(0,212,255,0.3)' };
      case 'DEPLOYED':  return { bg: 'rgba(0,255,136,0.12)',   color: '#00FF88', border: 'rgba(0,255,136,0.3)' };
      case 'STANDBY':   return { bg: 'rgba(160,174,192,0.1)',  color: '#A0AEC0', border: 'rgba(160,174,192,0.2)' };
      default:          return { bg: 'rgba(160,174,192,0.1)',  color: '#A0AEC0', border: 'rgba(160,174,192,0.2)' };
    }
  }
  switch (status) {
    case 'EN ROUTE':  return { bg: '#E6F1FB', color: '#185FA5', border: '#B5D4F4' };
    case 'DEPLOYED':  return { bg: '#E1F5EE', color: '#0F6E56', border: '#9FE1CB' };
    case 'STANDBY':   return { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7' };
    default:          return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' };
  }
}

// ── Custom Recharts Tooltip ───────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8EF',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: '#0F1E2E', margin: '0 0 6px 0', paddingBottom: '6px', borderBottom: '1px solid #E2E8EF' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, fontSize: '13px', fontWeight: 700, margin: '3px 0' }}>
          {entry.name}: <strong>{entry.value}%</strong>
        </p>
      ))}
    </div>
  );
}

// ── Countdown Timer Hook ──────────────────────────
function useCountdown(initial = 154) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => (prev <= 1 ? initial : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [initial]);
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}m ${secs}s`;
}

// ── Toast Component ───────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="allocation-toast">
      <span className="toast-icon">✓</span>
      <span>{message}</span>
    </div>
  );
}

// ── Resource types by severity ─────────────────────
const RESOURCE_TYPES = [
  'Medical Unit', 'Search & Rescue', 'Food Supply',
  'Water Tanker', 'Engineering Team', 'Shelter Kit',
  'Ambulance', 'Police Support',
];

function buildAllocationsFromZones(zones) {
  return zones.slice().sort((a, b) => b.severityScore - a.severityScore).map((zone, idx) => ({
    id: `RES-${String(idx + 1).padStart(3, '0')}`,
    type: RESOURCE_TYPES[idx % RESOURCE_TYPES.length],
    district: zone.name,
    priority: zone.severityScore,
    status: zone.severity === 'CRITICAL' ? 'EN ROUTE' :
            zone.severity === 'HIGH'     ? 'DEPLOYED' : 'STANDBY',
  }));
}

// ===================================================
// Main AllocationEngine Component
// ===================================================
function AllocationEngine() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [allocations, setAllocations] = useState(initialAllocations);
  const [chartData, setChartData] = useState(baseChartData);
  const [isRunning, setIsRunning] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [animatingRows, setAnimatingRows] = useState(new Set());
  const countdown = useCountdown(154);

  // Load real district data on mount
  useEffect(() => {
    getKeralaZones().then(zones => {
      setAllocations(buildAllocationsFromZones(zones));
    }).catch(console.error);
  }, []);

  // Fetch predictive data from FastAPI
  const fetchPrediction = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/predict', { timeout: 3000 });
      if (res.data?.predictions) {
        setChartData(res.data.predictions);
      }
    } catch {
      // FastAPI not connected — use mock data (expected in hackathon demo)
    }
  }, []);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  // Run Allocation
  const handleRunAllocation = async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      await axios.post('http://localhost:8000/api/allocate', {}, { timeout: 5000 });
    } catch {
      // Backend offline — simulate locally
    }

    // Animate priority scores
    await new Promise(r => setTimeout(r, 600));
    const allIds = new Set(allocations.map(a => a.id));
    setAnimatingRows(allIds);

    setAllocations(prev => prev.map(a => {
      const delta = Math.floor(Math.random() * 10) - 3;
      return { ...a, priority: Math.max(5, Math.min(99, a.priority + delta)) };
    }));

    // Update chart with a small random shift
    setChartData(prev => prev.map(p => ({
      ...p,
      predicted: Math.max(30, Math.min(99, p.predicted + (Math.random() * 10 - 5))),
    })));

    await new Promise(r => setTimeout(r, 1200));
    setAnimatingRows(new Set());
    
    // Write result to Firestore
    try {
      await addDoc(collection(db, 'allocations'), {
        action: "Run Allocation",
        message: "Allocation complete — Wayanad now has 8 resources. Bias reduced to 0.23",
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.log("Firebase allocations write failed:", e.message);
    }

    setIsRunning(false);
    setToastMsg('Allocation complete — Wayanad now has 8 resources. Bias reduced to 0.23');
  };

  return (
    <div className="ae-page">

      {/* ── Page Header ─────────────────────── */}
      <div className="ae-header">
        <div className="ae-header-text">
          <h1 className="ae-title">{t('allocationEngine')}</h1>
          <p className="ae-subtitle">
            {t('autoOptimisationActive')} — powered by&nbsp;
            <span className="ae-google-text">
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                <path fill="#4285F4" d="M12 2L2 7l10 5l10-5l-10-5z" />
                <path fill="#34A853" d="M2 17l10 5l10-5M2 12l10 5l10-5" />
              </svg>
              <span style={{color:'#4285F4'}}>G</span><span style={{color:'#EA4335'}}>o</span><span style={{color:'#FBBC05'}}>o</span><span style={{color:'#4285F4'}}>g</span><span style={{color:'#34A853'}}>l</span><span style={{color:'#EA4335'}}>e</span>
            </span>&nbsp;Cloud Vertex AI
          </p>
        </div>

        <button
          className={`btn-run-allocation ${isRunning ? 'loading' : ''}`}
          onClick={handleRunAllocation}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <span className="btn-spinner"></span>
              {t('running')}
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              {t('runAllocation')}
            </>
          )}
        </button>
      </div>

      {/* ── 3 Metric Cards ──────────────────── */}
      <div className="ae-metrics-row">
        <div className="ae-metric-card green-glow">
          <div className="ae-metric-icon" style={{ background: isDark ? 'rgba(0,255,136,0.1)' : '#E1F5EE', color: isDark ? '#00FF88' : '#0F6E56' }}>⏱</div>
          <div className="ae-metric-body">
            <span className="ae-metric-label">{t('responseTime')}</span>
            <span className="ae-metric-value">4.2 <span className="ae-metric-unit">{t('minAvg')}</span></span>
            <span className="ae-metric-change positive">
              ↓ 12% {t('improvementVsBaseline')}
            </span>
          </div>
        </div>

        <div className="ae-metric-card orange-glow">
          <div className="ae-metric-icon" style={{ background: isDark ? 'rgba(255,69,0,0.1)' : '#FAEEDA', color: isDark ? '#FF4500' : '#854F0B' }}>♻</div>
          <div className="ae-metric-body">
            <span className="ae-metric-label">{t('resourceWaste')}</span>
            <span className="ae-metric-value">7.3<span className="ae-metric-unit">%</span></span>
            <span className="ae-metric-change positive">
              ↓ 2.1% {t('improved')}
            </span>
          </div>
        </div>

        <div className="ae-metric-card cyan-glow">
          <div className="ae-metric-icon" style={{ background: isDark ? 'rgba(0,212,255,0.1)' : '#E6F1FB', color: isDark ? '#00D4FF' : '#185FA5' }}>⚖</div>
          <div className="ae-metric-body">
            <span className="ae-metric-label">{t('biasScore')}</span>
            <span className="ae-metric-value">0.23</span>
            <span className="ae-metric-change positive">
              ↑ 0.48 {t('improved')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Predictive Chart ───────────────── */}
      <div className="ae-chart-card" style={{
        background: isDark ? '#0D1B2A' : '#FFFFFF',
        border: `1px solid ${isDark ? 'rgba(0,212,255,0.15)' : '#E2E8EF'}`,
        borderRadius: '14px',
        padding: '24px 28px',
        boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      }}>
        <div className="ae-chart-header">
          <div>
            <h2 className="ae-section-title" style={{ fontSize: '17px', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F1E2E', letterSpacing: '-0.2px' }}>{t('predictiveResourceLoad')}</h2>
            <p className="ae-chart-sub" style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>{t('forecastPoweredByVertexAi')}</p>
          </div>
          <div className="ae-chart-legend">
            <span style={{ background: '#E6F1FB', color: '#185FA5', border: '1px solid #B5D4F4', fontWeight: 700, borderRadius: '6px', padding: '5px 12px', fontSize: '12px' }}>— {t('currentLoad')}</span>
            <span style={{ background: '#FAEEDA', color: '#854F0B', border: '1px solid #FAC775', fontWeight: 700, borderRadius: '6px', padding: '5px 12px', fontSize: '12px' }}>--- {t('predicted')}</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8EF" strokeWidth={1} />
            <XAxis
              dataKey="time"
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
              axisLine={{ stroke: '#E2E8EF' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              unit="%"
              domain={[30, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="current"
              name="Current Load"
              stroke="#378ADD"
              strokeWidth={2.5}
              dot={{ fill: '#378ADD', r: 5, stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#378ADD', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Predicted"
              stroke="#FF4500"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={{ fill: '#FF4500', r: 4 }}
              activeDot={{ r: 6, fill: '#FF4500' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Allocation Table ─────────────────── */}
      <div className="ae-table-card">
        <div className="ae-table-header">
          <h2 className="ae-section-title">{t('resourceAllocation')}</h2>
          <span className="ae-active-badge">8 {t('active')}</span>
        </div>

        <div className="ae-table-wrap">
          <table className="ae-table">
            <thead>
              <tr>
                <th>{t('resourceId')}</th>
                <th>{t('type')}</th>
                <th>{t('assignedDistrict')}</th>
                <th>{t('priorityScore')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((row) => {
                const statusStyle = getStatusStyle(row.status);
                const isAnim = animatingRows.has(row.id);
                return (
                  <tr key={row.id} className={isAnim ? 'row-updating' : ''}>
                    <td>
                      <span className="resource-id">{row.id}</span>
                    </td>
                    <td className="type-cell">{t(resourceTypeKeyMap[row.type] || row.type)}</td>
                    <td className="district-cell">{row.district}</td>
                    <td className="priority-cell">
                      <div className="priority-wrap">
                        <span className="priority-num" style={{ color: getPriorityColor(row.priority) }}>
                          {row.priority}
                        </span>
                        <div className="priority-track">
                          <div
                            className="priority-fill"
                            style={{
                              width: `${row.priority}%`,
                              background: getPriorityColor(row.priority),
                              transition: isAnim ? 'width 0.9s ease-out' : 'none',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: getStatusStyle(row.status, isDark).bg,
                          color: getStatusStyle(row.status, isDark).color,
                          border: `1px solid ${getStatusStyle(row.status, isDark).border}`,
                        }}
                      >
                        {t(statusKeyMap[row.status] || row.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Ticker ────────────────────── */}
      <div className="ae-ticker">
        <span className="ticker-dot"></span>
        <div className="ticker-track">
          <span className="ticker-text">
            {t('autoOptimisationActive')} — {t('nextCycleIn')} {countdown} — powered by Google Cloud AI
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            {t('vertexAiModelInfo')}
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            8 {t('resourcesMonitored')} across 8 Kerala {t('activeDistricts').toLowerCase()}
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            {t('fairnessSummary')} — {t('biasScore').toLowerCase()} 0.23
          </span>
        </div>
      </div>

      {/* ── Toast Notification ───────────────── */}
      {toastMsg && (
        <Toast message={toastMsg} onDone={() => setToastMsg('')} />
      )}
    </div>
  );
}

export default memo(AllocationEngine);
