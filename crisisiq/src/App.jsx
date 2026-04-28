// ============================================
// CrisisIQ — Main Application Router
// ============================================

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';

import Layout from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { GOOGLE_MAPS_ID, GOOGLE_MAPS_LIBRARIES } from './config/googleMaps';

import Dashboard from './pages/Dashboard';
import ResourceMap from './pages/ResourceMap';
import AllocationEngine from './pages/AllocationEngine';
import FairnessAnalytics from './pages/FairnessAnalytics';
import TransparencyLog from './pages/TransparencyLog';
import CitizenRequests from './pages/CitizenRequests';

// ── Error Boundary ──────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("CrisisIQ Component Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', background: '#050A14', color: '#fff', height: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: '24px', border: '1px solid rgba(255,23,68,0.2)' }}>
          <h1 style={{ color: '#FF1744', marginBottom: '16px' }}>Module Exception</h1>
          <p style={{ color: '#A0AEC0', maxWidth: '500px', marginBottom: '8px' }}>This section failed to load due to a runtime collision. The system can self-repair.</p>
          {this.state.error && (
            <p style={{ color: '#FF1744', fontSize: '12px', background: 'rgba(255,23,68,0.1)', padding: '8px 16px', borderRadius: '8px', marginBottom: '24px', fontFamily: 'monospace' }}>
              Error: {this.state.error.message || String(this.state.error)}
            </p>
          )}
          <button 
            onClick={() => window.location.reload()}
            style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #0072FF 100%)', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,212,255,0.3)' }}
          >
            REPAIR & RESTORE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Scroll Restoration ────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// ── Maps Loader Wrapper ───────────────────────
function AppContent() {
  const { setMapLoaded } = useAppContext();
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (isLoaded) setMapLoaded(true);
  }, [isLoaded, setMapLoaded]);

  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resource-map" element={<ResourceMap />} />
            <Route path="/allocation-engine" element={<AllocationEngine />} />
            <Route path="/fairness-analytics" element={<FairnessAnalytics />} />
            <Route path="/transparency-log" element={<TransparencyLog />} />
            <Route path="/citizen-requests" element={<CitizenRequests />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

const SuspenseFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '60vh', justifyContent: 'center', alignItems: 'center', color: '#A0AEC0' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 212, 255, 0.2)', borderTopColor: '#00D4FF', borderRadius: '50%', animation: 'cr-spin 1s linear infinite', marginBottom: '16px' }}></div>
    <span style={{ fontSize: '14px', fontWeight: 600 }}>Syncing Global Assets...</span>
  </div>
);

function App() {
  return (
    <AppProvider>
      <LanguageProvider>
        <ThemeProvider>
          <Router>
            <ScrollToTop />
            <AppContent />
          </Router>
        </ThemeProvider>
      </LanguageProvider>
    </AppProvider>
  );
}

export default App;
