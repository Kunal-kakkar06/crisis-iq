// =====================================================
// CrisisIQ — Fairness Analytics Page
// Bias detection and equitable resource distribution
// =====================================================

import { useState, useEffect, memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts';
import './FairnessAnalytics.css';

// ── Data: Bias Reduction Chart (Before/After) ────
const targetChartData = [
  { district: 'Wayanad',    before: 88, after: 12 }, // was high deficit/bias, now low
  { district: 'Idukki',     before: 76, after: 18 },
  { district: 'Palakkad',   before: 65, after: 22 },
  { district: 'Thrissur',   before: 42, after: 31 },
  { district: 'Malappuram', before: 51, after: 28 },
  { district: 'Alappuzha',  before: 38, after: 35 },
  { district: 'Kottayam',   before: 25, after: 42 },
  { district: 'Ernakulam',  before: 15, after: 85 }, // was getting everything
];

const initialChartData = [
  { district: 'Wayanad',    before: 88, after: 88 }, 
  { district: 'Idukki',     before: 76, after: 76 },
  { district: 'Palakkad',   before: 65, after: 65 },
  { district: 'Thrissur',   before: 42, after: 42 },
  { district: 'Malappuram', before: 51, after: 51 },
  { district: 'Alappuzha',  before: 38, after: 38 },
  { district: 'Kottayam',   before: 25, after: 25 },
  { district: 'Ernakulam',  before: 15, after: 15 },
];

// ── Data: Mock Scatter for Insight Card ──────────
const scatterData = [
  { x: 10, y: 30, z: 200, name: 'Rural 1' },
  { x: 20, y: 50, z: 260, name: 'Rural 2' },
  { x: 40, y: 80, z: 400, name: 'Urban 1' },
  { x: 50, y: 90, z: 280, name: 'Urban 2' },
  { x: 30, y: 60, z: 200, name: 'Suburban' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="fa-tooltip">
      <p className="fa-tooltip-label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.fill }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

function FairnessAnalytics() {
  const [fairEnabled, setFairEnabled] = useState(false);
  const [biasScore, setBiasScore] = useState(0.71);
  const [chartData, setChartData] = useState(initialChartData);
  const [particles, setParticles] = useState(false);

  // Toggle Effect logic
  useEffect(() => {
    if (fairEnabled) {
      // Animate score down from 0.71 to 0.23
      let current = 0.71;
      const interval = setInterval(() => {
        current -= 0.02;
        if (current <= 0.23) {
          current = 0.23;
          clearInterval(interval);
          setParticles(true); // fire particles
          setTimeout(() => setParticles(false), 1500);
        }
        setBiasScore(parseFloat(current.toFixed(2)));
      }, 50);

      // Animate chart bars
      setChartData(targetChartData);

      return () => clearInterval(interval);
    } else {
      setBiasScore(0.71);
      setChartData(initialChartData);
    }
  }, [fairEnabled]);

  return (
    <div className="fa-page">

      {/* ── Page Header ─────────────────────── */}
      <div className="fa-header">
        <div className="fa-header-text">
          <h1 className="fa-title">Fairness Analytics</h1>
          <p className="fa-subtitle">
            Bias detection and equitable resource distribution — powered by&nbsp;
            <span className="fa-google-text">
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                <path fill="#4285F4" d="M12 2L2 7l10 5l10-5l-10-5z" />
                <path fill="#34A853" d="M2 17l10 5l10-5M2 12l10 5l10-5" />
              </svg>
              <span style={{color:'#4285F4'}}>G</span><span style={{color:'#EA4335'}}>o</span><span style={{color:'#FBBC05'}}>o</span><span style={{color:'#4285F4'}}>g</span><span style={{color:'#34A853'}}>l</span><span style={{color:'#EA4335'}}>e</span>
            </span>
            &nbsp;Cloud Natural Language API
          </p>
        </div>

        <div className="fa-header-action">
          <span className="fa-toggle-label">Enable Fair Allocation</span>
          <button 
            className={`fa-toggle-btn ${fairEnabled ? 'active' : ''}`}
            onClick={() => setFairEnabled(!fairEnabled)}
          >
            <div className="fa-toggle-track">
              <div className="fa-toggle-thumb"></div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Top Two Cards ─────────────────────── */}
      <div className="fa-top-row">
        
        {/* Bias Score Card */}
        <div className={`fa-card bias-card ${fairEnabled ? 'fair' : 'biased'}`}>
          {particles && <div className="particles-burst"></div>}
          
          <div className="bias-card-header">
            <h3>System Bias Score</h3>
            <span className="prev-score">Previous: 0.71 (High Bias)</span>
          </div>

          <div className="bias-score-wrap">
            <span className="bias-score-val" style={{ color: fairEnabled ? '#00FF88' : '#FF1744' }}>
              {biasScore.toFixed(2)}
            </span>
            <div className={`bias-badge ${fairEnabled ? 'badge-green' : 'badge-red'}`}>
              {fairEnabled ? 'Low bias — within acceptable range' : 'High bias — action required'}
            </div>
          </div>

          <div className="bias-progress-container">
            <div 
              className="bias-progress-fill"
              style={{
                width: `${(biasScore / 1.0) * 100}%`,
                background: fairEnabled ? '#00FF88' : '#FF1744'
              }}
            ></div>
          </div>
          <div className="bias-scale">
            <span>0.0 (Fair)</span>
            <span>1.0 (Biased)</span>
          </div>
        </div>

        {/* Distribution Equity Card */}
        <div className="fa-card equity-card">
          <div className="equity-header">
            <h3>Distribution Equity</h3>
            <span className="equity-badge">Equitable Distribution</span>
          </div>
          
          <div className="equity-score">94.2<span className="percent">%</span></div>

          <div className="equity-pills">
            <div className="eq-pill urban">
              <span className="eq-pill-val">91%</span>
              <span className="eq-pill-lbl">URBAN</span>
            </div>
            <div className="eq-pill rural">
              <span className="eq-pill-val">97%</span>
              <span className="eq-pill-lbl">RURAL</span>
            </div>
            <div className="eq-pill suburban">
              <span className="eq-pill-val">95%</span>
              <span className="eq-pill-lbl">SUBURBAN</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bias Reduction Chart ──────────────── */}
      <div className="fa-card chart-card">
        <div className="chart-header">
          <h2>Bias Reduction — Before vs After Fair Allocation</h2>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
            <XAxis type="number" tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={{stroke:'rgba(255,255,255,0.1)'}} tickLine={false} />
            <YAxis dataKey="district" type="category" width={90} tick={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '13px' }} />
            <Bar dataKey="before" name="Before (High Bias)" fill="#FF1744" radius={[0,4,4,0]} barSize={12} animationDuration={1200} />
            <Bar dataKey="after" name="After (Fair Allocation)" fill="#00FF88" radius={[0,4,4,0]} barSize={12} animationDuration={1200} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 3 Insight Cards Row ───────────────── */}
      <div className="fa-insights-row">
        
        <div className="fa-card insight-sm-card">
          <div className="insight-top">
            <h4>Population Density vs Resources</h4>
            <span className="insight-status-badge green">Optimal balance achieved</span>
          </div>
          <div className="insight-chart-mini">
            <ResponsiveContainer width="100%" height={80}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: -10, left: -20 }}>
                <XAxis type="number" dataKey="x" hide />
                <YAxis type="number" dataKey="y" hide />
                <ZAxis type="number" dataKey="z" range={[20, 200]} />
                <Scatter data={scatterData} fill="#00D4FF" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="insight-desc">Clear linear correlation established across all 8 zones.</p>
        </div>

        <div className="fa-card insight-sm-card">
          <div className="insight-top">
            <h4>Infrastructure Access</h4>
            <span className="insight-status-badge red">-2.6 min rural penalty — being addressed</span>
          </div>
          <div className="infra-list">
            <div className="infra-item">
              <span className="infra-lbl">Districts 1-3</span>
              <span className="infra-val green">✓ Good</span>
            </div>
            <div className="infra-item">
              <span className="infra-lbl">Districts 4-5</span>
              <span className="infra-val amber">⚠ Fair</span>
            </div>
            <div className="infra-item">
              <span className="infra-lbl">Districts 6-8</span>
              <span className="infra-val red">● Limited</span>
            </div>
          </div>
        </div>

        <div className="fa-card insight-sm-card">
          <div className="insight-top">
            <h4>Response Time Drift</h4>
            <span className="insight-status-badge cyan">Real-time tracking</span>
          </div>
          <div className="drift-metrics">
            <div className="drift-stat">
              <span className="lbl">Urban</span>
              <span className="val">3.2<small>m</small></span>
            </div>
            <div className="drift-stat">
              <span className="lbl">Rural</span>
              <span className="val">5.8<small>m</small></span>
            </div>
            <div className="drift-stat">
              <span className="lbl">Suburban</span>
              <span className="val">4.1<small>m</small></span>
            </div>
          </div>
        </div>

      </div>

      {/* ── System Insights Strip ─────────────── */}
      <div className="fa-strip">
        <div className="strip-title">AI Natural Language Insights</div>
        <div className="strip-items">
          <div className="strip-item">
            <span className="strip-arr">→</span>
            Resources reallocated to underserved areas
          </div>
          <div className="strip-item">
            <span className="strip-arr">→</span>
            Wayanad response time improved by 94.3%
          </div>
          <div className="strip-item">
            <span className="strip-arr">→</span>
            Rural distribution equity increased to 97%
          </div>
        </div>
      </div>

    </div>
  );
}

export default memo(FairnessAnalytics);
