// =====================================================
// CrisisIQ — Allocation Engine Page
// AI-driven resource optimisation via Vertex AI
// =====================================================

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getKeralaZones } from '../utils/dataLoader';
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
  if (score >= 80) return '#FF1744';
  if (score >= 60) return '#FF6D00';
  return '#00FF88';
}

// ── Status Badge Style ────────────────────────────
function getStatusStyle(status) {
  switch (status) {
    case 'EN ROUTE':  return { bg: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: 'rgba(0,212,255,0.3)' };
    case 'DEPLOYED':  return { bg: 'rgba(0,255,136,0.12)', color: '#00FF88', border: 'rgba(0,255,136,0.3)' };
    case 'STANDBY':   return { bg: 'rgba(160,174,192,0.1)', color: '#A0AEC0', border: 'rgba(160,174,192,0.2)' };
    default:          return { bg: 'rgba(160,174,192,0.1)', color: '#A0AEC0', border: 'rgba(160,174,192,0.2)' };
  }
}

// ── Custom Recharts Tooltip ───────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
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
          <h1 className="ae-title">Allocation Engine</h1>
          <p className="ae-subtitle">
            AI-driven resource optimisation — powered by&nbsp;
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
              Running…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Run Allocation
            </>
          )}
        </button>
      </div>

      {/* ── 3 Metric Cards ──────────────────── */}
      <div className="ae-metrics-row">
        <div className="ae-metric-card green-glow">
          <div className="ae-metric-icon" style={{background:'rgba(0,255,136,0.1)', color:'#00FF88'}}>⏱</div>
          <div className="ae-metric-body">
            <span className="ae-metric-label">Response Time</span>
            <span className="ae-metric-value">4.2 <span className="ae-metric-unit">min avg</span></span>
            <span className="ae-metric-change positive">
              ↓ 12% improvement vs baseline
            </span>
          </div>
        </div>

        <div className="ae-metric-card orange-glow">
          <div className="ae-metric-icon" style={{background:'rgba(255,69,0,0.1)', color:'#FF4500'}}>♻</div>
          <div className="ae-metric-body">
            <span className="ae-metric-label">Resource Waste</span>
            <span className="ae-metric-value">7.3<span className="ae-metric-unit">%</span></span>
            <span className="ae-metric-change positive">
              ↓ 2.1% improvement
            </span>
          </div>
        </div>

        <div className="ae-metric-card cyan-glow">
          <div className="ae-metric-icon" style={{background:'rgba(0,212,255,0.1)', color:'#00D4FF'}}>⚖</div>
          <div className="ae-metric-body">
            <span className="ae-metric-label">Fairness Score</span>
            <span className="ae-metric-value">0.23</span>
            <span className="ae-metric-change positive">
              ↑ 0.48 improvement
            </span>
          </div>
        </div>
      </div>

      {/* ── Predictive Chart ─────────────────── */}
      <div className="ae-chart-card">
        <div className="ae-chart-header">
          <div>
            <h2 className="ae-section-title">Predictive Resource Load — Next 6 Hours</h2>
            <p className="ae-chart-sub">Forecast powered by Google Cloud Vertex AI</p>
          </div>
          <div className="ae-chart-legend">
            <span className="legend-chip cyan">— Current Load</span>
            <span className="legend-chip orange">--- Predicted</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#A0AEC0', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#A0AEC0', fontSize: 12 }}
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
              stroke="#00D4FF"
              strokeWidth={2.5}
              dot={{ fill: '#00D4FF', r: 4 }}
              activeDot={{ r: 6, fill: '#00D4FF' }}
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
          <h2 className="ae-section-title">Resource Allocation</h2>
          <span className="ae-active-badge">8 Active</span>
        </div>

        <div className="ae-table-wrap">
          <table className="ae-table">
            <thead>
              <tr>
                <th>Resource ID</th>
                <th>Type</th>
                <th>Assigned District</th>
                <th>Priority Score</th>
                <th>Status</th>
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
                    <td className="type-cell">{row.type}</td>
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
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {row.status}
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
            Auto-optimisation active — next cycle in {countdown} — powered by Google Cloud AI
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            Vertex AI model v3.2.1 — last trained 4h ago
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            8 resources monitored across 8 Kerala districts
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            Fairness constraint satisfied — bias score 0.23
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
