// ============================================
// CrisisIQ — Main Application Router
// ============================================

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

import Dashboard from './pages/Dashboard';
const ResourceMap = lazy(() => import('./pages/ResourceMap'));
const AllocationEngine = lazy(() => import('./pages/AllocationEngine'));
const FairnessAnalytics = lazy(() => import('./pages/FairnessAnalytics'));
const TransparencyLog = lazy(() => import('./pages/TransparencyLog'));
const CitizenRequests = lazy(() => import('./pages/CitizenRequests'));

const SuspenseFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '60vh', justifyContent: 'center', alignItems: 'center', color: '#A0AEC0' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 212, 255, 0.2)', borderTopColor: '#00D4FF', borderRadius: '50%', animation: 'cr-spin 1s linear infinite', marginBottom: '16px' }}></div>
    <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading Architecture...</span>
  </div>
);

function App() {
  return (
    <LanguageProvider>
    <ThemeProvider>
      <Router>
        <Layout>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/resource-map" element={<ResourceMap />} />
              <Route path="/allocation-engine" element={<AllocationEngine />} />
              <Route path="/fairness-analytics" element={<FairnessAnalytics />} />
              <Route path="/transparency-log" element={<TransparencyLog />} />
              <Route path="/citizen-requests" element={<CitizenRequests />} />
              {/* Default route redirects to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
