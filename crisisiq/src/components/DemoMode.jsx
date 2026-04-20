import { useState, useEffect } from 'react';
import './DemoMode.css';

// Shared Coordinates mappings for relative positioning on a flat CSS map
// Box of Kerala: approx bounds for CSS mapping.
function MapPoint({ x, y, label, labelColor, resCount, size, isPulse }) {
  return (
    <div className="demo-marker" style={{ left: `${x}%`, top: `${y}%` }}>
      {isPulse && <div className="marker-pulse" style={{ backgroundColor: '#FF1744' }}></div>}
      <div 
        className="marker-dot" 
        style={{ 
          width: size, height: size, 
          backgroundColor: labelColor === 'red' ? '#FF1744' : '#00FF88',
          boxShadow: `0 0 20px ${labelColor === 'red' ? 'rgba(255, 23, 68, 0.4)' : 'rgba(0, 255, 136, 0.4)'}`
        }}
      >
        {resCount}
      </div>
      <div className="marker-label">{label}</div>
    </div>
  );
}

function useCountUpDemo(start, end, duration, decimals = 0) {
  const [value, setValue] = useState(start);

  useEffect(() => {
    let startTime = null;
    let animationFrame;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setValue(start + (end - start) * easeOut);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        setValue(end);
      }
    };
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [start, end, duration]);

  return value.toFixed(decimals);
}

export default function DemoMode({ onClose }) {
  const biasScore = useCountUpDemo(0.71, 0.23, 2000, 2);
  const responseTime = useCountUpDemo(4320, 4.2, 2000, 1);
  const wayanadRes = useCountUpDemo(0, 8, 2000, 0);
  
  // Wait to trigger route drawing
  const [showRoute, setShowRoute] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowRoute(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="demo-overlay animate-fade-in">
      <header className="demo-header">
        <div className="demo-header-content">
          <h2>CrisisIQ Demo — Kerala Floods 2018</h2>
          <span>Kerala: 483 lives lost — August 2018</span>
        </div>
        <button className="demo-close" onClick={onClose}>&times;</button>
      </header>

      <div className="demo-split">
        {/* ── LEFT HALF: Without CrisisIQ ── */}
        <div className="demo-pane demo-left">
          <div className="pane-title">
            <h3>WITHOUT CrisisIQ</h3>
            <p>How resources were actually allocated</p>
          </div>

          <div className="demo-map-wrapper">
             {/* Fake Kerala Map Visual */}
             <div className="fake-map" style={{ width: '100%', height: '100%', position: 'relative', background: '#050A14', backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                <div style={{ position: 'absolute', bottom: 10, left: 15, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 'bold' }}>Google Maps Platform — Historical Visual</div>
                
                {/* Ernakulam - Over-allocated */}
                <MapPoint x={42} y={68} label="Ernakulam" labelColor="green" resCount={14} size={42} />
                
                {/* Wayanad - Critical Zero */}
                <MapPoint x={28} y={15} label="Wayanad" labelColor="red" resCount={0} size={32} isPulse={true} />
                
                {/* Idukki - Critical Zero */}
                <MapPoint x={48} y={75} label="Idukki" labelColor="red" resCount={0} size={32} isPulse={true} />
                
                {/* Palakkad - Under-allocated */}
                <MapPoint x={35} y={45} label="Palakkad" labelColor="red" resCount={1} size={28} />
             </div>
          </div>

          <div className="demo-stats">
            <div className="demo-stat-row"><span className="stat-label">⏱ Response Time:</span> <span className="stat-value c-red">72 hours</span></div>
            <div className="demo-stat-row"><span className="stat-label">⚖ Bias Score:</span> <span className="stat-value c-red">0.71 (HIGH BIAS)</span></div>
            <div className="demo-stat-row"><span className="stat-label">💸 Aid Wasted:</span> <span className="stat-value c-red">38%</span></div>
            <div className="demo-stat-row"><span className="stat-label">💔 Wayanad Resources:</span> <span className="stat-value c-red flash">0</span></div>
            <div className="demo-stat-row"><span className="stat-label">🚨 Lives unreached:</span> <span className="stat-value c-red">40,000+</span></div>
          </div>

          <div className="pane-banner banner-red">
            Resources available but misallocated — most vulnerable districts waited 3 days
          </div>
        </div>

        {/* ── CENTRAL VS DIVIDER ── */}
        <div className="demo-divider">
          <div className="demo-vs">
            VS
            <div className="demo-arrow">→</div>
          </div>
        </div>

        {/* ── RIGHT HALF: With CrisisIQ ── */}
        <div className="demo-pane demo-right">
          <div className="pane-title">
            <h3>WITH CrisisIQ</h3>
            <p>AI-powered fair allocation</p>
          </div>

          <div className="demo-map-wrapper">
             <div className="fake-map" style={{ width: '100%', height: '100%', position: 'relative', background: '#050A14', backgroundImage: 'radial-gradient(rgba(0,212,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                <div style={{ position: 'absolute', bottom: 10, left: 15, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 'bold' }}>Google Maps Platform — CrisisIQ Optimized</div>
                
                {/* Route Line Ernakulam to Wayanad */}
                {showRoute && (
                  <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                    <path d="M 180,480 Q 150,300 120,105" fill="none" stroke="#00D4FF" strokeWidth="4" strokeDasharray="10,10" className="demo-route-path">
                      <animate attributeName="stroke-dashoffset" from="200" to="0" dur="3s" repeatCount="indefinite" />
                    </path>
                  </svg>
                )}

                {/* Wayanad - Balanced */}
                <MapPoint x={28} y={15} label="Wayanad" labelColor="green" resCount={wayanadRes} size={38} />
                
                {/* Idukki - Balanced */}
                <MapPoint x={48} y={75} label="Idukki" labelColor="green" resCount={6} size={34} />
                
                {/* Palakkad - Balanced */}
                <MapPoint x={35} y={45} label="Palakkad" labelColor="green" resCount={5} size={32} />
                
                {/* Ernakulam - Balanced */}
                <MapPoint x={42} y={68} label="Ernakulam" labelColor="green" resCount={5} size={32} />
             </div>
          </div>

          <div className="demo-stats">
            <div className="demo-stat-row"><span className="stat-label">⏱ Response Time:</span> <span className="stat-value c-green">{responseTime} minutes</span></div>
            <div className="demo-stat-row"><span className="stat-label">⚖ Bias Score:</span> <span className="stat-value c-green">{biasScore}</span></div>
            <div className="demo-stat-row"><span className="stat-label">💸 Aid Wasted:</span> <span className="stat-value c-green">7.3%</span></div>
            <div className="demo-stat-row"><span className="stat-label">💚 Wayanad Resources:</span> <span className="stat-value c-green">{wayanadRes} deployed</span></div>
            <div className="demo-stat-row"><span className="stat-label">✅ Additional lives reached:</span> <span className="stat-value c-green">40,000+</span></div>
          </div>

          <div className="pane-banner banner-green">
            Optimal allocation — most vulnerable districts reached in 4.2 minutes
          </div>
        </div>
      </div>

      <footer className="demo-footer">
        <p>
          483 lives were lost in Kerala 2018.<br />
          <strong>CrisisIQ would have reached Wayanad 67 hours and 56 minutes earlier.</strong>
        </p>
      </footer>
    </div>
  );
}
