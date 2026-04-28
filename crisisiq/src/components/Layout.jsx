// ============================================
// CrisisIQ — Global Layout (Sidebar + Navbar)
// ============================================

import { useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DemoMode from './DemoMode';
import NotificationPanel from './NotificationPanel';
import SettingsPanel from './SettingsPanel';
import GeminiChat from './GeminiChat';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';

// ── Navigation Items ──────────────────────────
const navItems = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/resource-map',
    label: 'Resource Map',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    path: '/allocation-engine',
    label: 'Allocation Engine',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    path: '/fairness-analytics',
    label: 'Fairness Analytics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" />
        <path d="M5 6l7-3 7 3" />
        <path d="M2 12h4l1-4 1 4H2z" />
        <path d="M16 12h4l1-4 1 4h-6z" />
        <circle cx="4" cy="14" r="2" />
        <circle cx="20" cy="14" r="2" />
      </svg>
    ),
  },
  {
    path: '/transparency-log',
    label: 'Transparency Log',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    path: '/citizen-requests',
    label: 'Citizen Requests',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

// ── Page title map ────────────────────────────
const pageTitles = {
  '/dashboard': 'Dashboard',
  '/resource-map': 'Resource Map',
  '/allocation-engine': 'Allocation Engine',
  '/fairness-analytics': 'Fairness Analytics',
  '/transparency-log': 'Transparency Log',
  '/citizen-requests': 'Citizen Requests',
};

function Layout({ children }) {
  const { isDark, toggleTheme } = useTheme();
  const { t, language, currentLang } = useLanguage();
  const location = useLocation();
  const [fairnessEnabled, setFairnessEnabled] = useState(true);
  const [crisisActive, setCrisisActive] = useState(true);
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Translation keys for page titles
  const pathToKey = {
    '/dashboard': 'dashboard', '/resource-map': 'resourceMap',
    '/allocation-engine': 'allocationEngine', '/fairness-analytics': 'fairnessAnalytics',
    '/transparency-log': 'transparencyLog', '/citizen-requests': 'citizenRequests',
  };
  const currentTitle = t(pathToKey[location.pathname] || 'dashboard');

  // Translation keys for nav labels
  const navLabelKeys = {
    'Dashboard': 'dashboard', 'Resource Map': 'resourceMap',
    'Allocation Engine': 'allocationEngine', 'Fairness Analytics': 'fairnessAnalytics',
    'Transparency Log': 'transparencyLog', 'Citizen Requests': 'citizenRequests',
  };

  useEffect(() => {
    try {
      const connectedRef = ref(rtdb, '.info/connected');
      const unsubscribe = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          setIsFirebaseConnected(true);
        } else {
          setIsFirebaseConnected(false);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("RTDB connection checking failed:", e);
    }
  }, []);

  return (
    <div className="layout-wrapper">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Logo */}
        <Link to="/dashboard" className="sidebar-logo" style={{ textDecoration: 'none' }}>
          <div className="logo-icon">
            <span>CQ</span>
          </div>
          <span className="logo-text">CrisisIQ</span>
        </Link>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="nav-link"
                style={{
                  borderLeft: isActive ? '3px solid #00D4FF' : '3px solid transparent',
                  background: isActive ? 'rgba(0,212,255,0.1)' : 'transparent',
                  color: isActive ? '#00D4FF' : '#9CA3AF',
                  textDecoration: 'none'
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{t(navLabelKeys[item.label] || 'dashboard')}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-row">
              <span className="status-dot" style={{ backgroundColor: isFirebaseConnected ? '#00FF88' : '#FFB800', boxShadow: `0 0 8px ${isFirebaseConnected ? '#00FF88' : '#FFB800'}` }}></span>
              <span className="status-text">{isFirebaseConnected ? 'Firebase Connected' : 'Demo Mode — Kerala 2018 Data'}</span>
            </div>
            <span className="version-text">{t('systemVersion')}</span>
          </div>

          <div className="google-badge">
            <span className="google-badge-text">{t('poweredBy')}</span>
            <div className="google-logo">
              <span style={{ color: '#4285F4' }}>G</span>
              <span style={{ color: '#EA4335' }}>o</span>
              <span style={{ color: '#FBBC05' }}>o</span>
              <span style={{ color: '#4285F4' }}>g</span>
              <span style={{ color: '#34A853' }}>l</span>
              <span style={{ color: '#EA4335' }}>e</span>
              <span style={{ color: '#A0AEC0', marginLeft: '4px' }}>Cloud</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="main-area">
        {/* Navbar */}
        <header className="navbar">
          <div className="navbar-left">
            {/* Title removed per user request */}
          </div>

          <div className="navbar-center" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {crisisActive && (
              <div className="crisis-badge">
                <span className="crisis-dot"></span>
                <span>⚠ {t('crisisModeActive').toUpperCase()}</span>
              </div>
            )}
            <button 
              className="btn-demo" 
              style={{ 
                background: 'rgba(0, 212, 255, 0.25)', 
                border: '2px solid #00D4FF', 
                color: '#FFFFFF', 
                padding: '6px 16px', 
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onClick={() => setDemoModeEnabled(true)}
            >
              <span style={{ fontSize: '12px', color: '#00D4FF' }}>▶</span>
              {t('demoMode')}
            </button>
          </div>

          <div className="navbar-right">
            <button 
              className={`btn-deactivate ${!crisisActive ? 'btn-activate' : ''}`} 
              id="btn-deactivate-crisis"
              onClick={() => setCrisisActive(!crisisActive)}
              style={{ 
                background: crisisActive ? 'rgba(255, 23, 68, 0.2)' : 'rgba(0, 255, 136, 0.2)', 
                color: crisisActive ? '#FF1744' : '#00FF88', 
                border: `2px solid ${crisisActive ? '#FF1744' : '#00FF88'}`,
                padding: '6px 16px',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: '13px',
                textTransform: 'uppercase',
                boxShadow: `0 0 15px ${crisisActive ? 'rgba(255, 23, 68, 0.3)' : 'rgba(0, 255, 136, 0.3)'}`
              }}
            >
              {crisisActive ? t('deactivateCrisis') : 'Activate Crisis'}
            </button>

            <button
              className={`btn-fairness ${fairnessEnabled ? 'btn-fairness-on' : 'btn-fairness-off'}`}
              id="btn-toggle-fairness"
              onClick={() => setFairnessEnabled(!fairnessEnabled)}
            >
              <span className="toggle-track">
                <span className="toggle-thumb"></span>
              </span>
              <span>{fairnessEnabled ? t('fairnessOn') : t('fairnessOff')}</span>
            </button>

            {/* Settings Gear — shows language badge when not English */}
            <button
              className="navbar-icon-btn"
              id="btn-settings"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
              style={{ 
                position: 'relative',
                color: '#FFFFFF',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '8px'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {language !== 'en' && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#00D4FF', color: '#000', fontSize: '9px', fontWeight: 900,
                  padding: '2px 4px', borderRadius: '4px', lineHeight: 1.2,
                  boxShadow: '0 0 8px rgba(0, 212, 255, 0.5)'
                }}>{currentLang.code.toUpperCase()}</span>
              )}
            </button>

            {/* Dark/Light Mode Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="navbar-icon-btn" 
              style={{ 
                padding: '8px', 
                fontSize: '18px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                color: '#FFFFFF'
              }}
              aria-label="Toggle Theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Notification Bell — powered by NotificationPanel */}
            <NotificationPanel onUnreadChange={setUnreadCount} />



            <div className="profile-avatar" id="profile-avatar">
              <span>KK</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main key={location.pathname} className="page-content" style={{ display: 'flex', flexDirection: 'column' }}>
          {!isFirebaseConnected && (
            <div className={isDark ? 'demo-banner-dark' : 'demo-banner-light'} style={{
              backgroundColor: isDark ? 'rgba(255, 184, 0, 0.15)' : '#FFFBEB',
              border: isDark ? '1px solid #FFB800' : '1px solid #FAC775',
              color: isDark ? '#FFB800' : '#854F0B',
              padding: '12px 20px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: 600
            }}>
              <span>⚠</span>
              <span>{t('demoBanner')}</span>
            </div>
          )}
          <div style={{ flex: 1 }}>{children}</div>
          <div style={{ textAlign: 'center', padding: '20px 0 10px', color: '#4A5568', fontSize: '12px', fontWeight: 500, letterSpacing: '0.5px' }}>
            Built for Google Solution Challenge 2026
          </div>
        </main>
      </div>

      {/* ── Demo Mode Overlay ── */}
      {demoModeEnabled && <DemoMode onClose={() => setDemoModeEnabled(false)} />}

      {/* ── Settings Panel ── */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {/* ── Gemini AI Assistant ── */}
      <GeminiChat />
    </div>
  );
}

export default Layout;
