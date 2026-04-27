// ============================================
// CrisisIQ — Notification Panel
// ============================================
// Real-time Firestore-backed notification feed
// with tabs, mark-all-read, and seed button.
// ============================================

import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, orderBy,
  writeBatch, doc, addDoc, serverTimestamp, where, getDocs
} from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { keralaZones } from '../config/googleMaps';

// ── Seed data ──────────────────────────────────
const SEED_NOTIFICATIONS = [
  { type: 'critical', title: 'Resource shortage detected', description: 'Medical supplies critically low. Immediate reallocation required.', district: 'Wayanad', read: false },
  { type: 'critical', title: 'Ambulance AMB-001 delayed', description: 'Route blocked due to flooding on NH-766. ETA +47 min.', district: 'Idukki', read: false },
  { type: 'critical', title: 'Bias threshold exceeded', description: 'Allocation fairness score dropped to 0.71. Review required.', district: 'Palakkad', read: false },
  { type: 'critical', title: 'SOS received', description: 'High-priority distress signal from district hospital ICU.', district: 'Thrissur', read: false },
  { type: 'warning', title: 'Medical supplies running low', description: 'Current stock covers 48h. Reorder threshold breached.', district: 'Malappuram', read: false },
  { type: 'warning', title: 'Response time drift detected', description: 'Average response time +12 min above baseline in rural zones.', district: 'Rural Zones', read: true },
  { type: 'warning', title: 'Human override flagged', description: 'Zone reallocation overridden by field coordinator — logged.', district: 'Alappuzha', read: true },
  { type: 'warning', title: 'Weather alert: Heavy rainfall', description: 'IMD red alert issued. River levels rising rapidly.', district: 'Kozhikode', read: false },
  { type: 'system', title: 'Auto-optimisation completed', description: 'Bias score reduced from 0.71 → 0.23. Allocation rebalanced.', district: 'All Zones', read: true },
  { type: 'system', title: 'Firebase sync successful', description: 'All zone data synced. Last update: 19:42 IST.', district: 'All Zones', read: true },
  { type: 'system', title: 'New citizen request received', description: 'Food & water request from displaced family group.', district: 'Alappuzha', read: false },
  { type: 'system', title: 'Allocation Engine cycle complete', description: 'Full optimization cycle took 2m 34s. 8 zones updated.', district: 'All Zones', read: true },
  { type: 'success', title: 'Resources delivered — confirmed', description: 'Field team confirmed delivery of 4 medical kits.', district: 'Kottayam', read: true },
  { type: 'success', title: 'Fairness check passed', description: 'Distribution equity score: 94.2%. No bias detected.', district: 'All Zones', read: true },
  { type: 'success', title: 'Field team response confirmed', description: 'NDRF team on ground. Evacuation of 200 residents complete.', district: 'Ernakulam', read: true },
];

// ── Type config ────────────────────────────────
const TYPE_CONFIG = {
  critical: { color: '#FF1744', border: '#FF1744', icon: '🔴', label: 'Critical' },
  warning:  { color: '#FF6D00', border: '#FFB800', icon: '⚠️', label: 'Warning' },
  system:   { color: '#00D4FF', border: '#00D4FF', icon: '📊', label: 'System' },
  success:  { color: '#00FF88', border: '#00FF88', icon: '✅', label: 'Success' },
};

function timeAgo(ts) {
  if (!ts) return 'just now';
  const diff = Date.now() - ts.toMillis();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Main Component ─────────────────────────────
export default function NotificationPanel({ onUnreadChange }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [seeding, setSeeding] = useState(false);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  // ── Firestore real-time listener ─────────────
  useEffect(() => {
    let unsub;
    try {
      const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'));
      unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotifications(docs);
        const unread = docs.filter(n => !n.read).length;
        onUnreadChange?.(unread);
      }, () => {
        // Firebase unavailable — use seed data as mock
        setNotifications(SEED_NOTIFICATIONS.map((n, i) => ({
          ...n, id: String(i),
          timestamp: { toMillis: () => Date.now() - i * 60000 }
        })));
      });
    } catch {
      setNotifications(SEED_NOTIFICATIONS.map((n, i) => ({
        ...n, id: String(i),
        timestamp: { toMillis: () => Date.now() - i * 60000 }
      })));
    }
    return () => unsub?.();
  }, []);

  // ── Close on outside click & ESC ─────────────
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // ── Mark single as read ───────────────────────
  const markRead = async (id) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'notifications', id), { read: true });
      await batch.commit();
    } catch {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    }
  };

  // ── Mark all as read ──────────────────────────
  const markAllRead = async () => {
    try {
      const q = query(collection(db, 'notifications'), where('read', '==', false));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { read: true }));
      await batch.commit();
    } catch {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  // ── Seed test data ────────────────────────────
  const seedNotifications = async () => {
    setSeeding(true);
    try {
      // 1. Generate dynamic notifications from existing data
      const dynamicSeeds = [];
      keralaZones.forEach(zone => {
        if (zone.severityScore > 80) {
          dynamicSeeds.push({
            type: 'critical',
            title: `Resource shortage detected — ${zone.name}`,
            description: `Zone severity score is ${zone.severityScore}. Immediate action required.`,
            district: zone.name,
            read: false
          });
        }
      });
      // Add simulated mockAuditLogs behavior
      dynamicSeeds.push({
        type: 'warning',
        title: 'Human override flagged',
        description: 'Zone reallocation overridden by field coordinator — logged.',
        district: 'Ernakulam',
        read: false
      });
      dynamicSeeds.push({
        type: 'system',
        title: 'Allocation cycle complete',
        description: 'Route optimization & resource balancing finished successfully.',
        district: 'All Zones',
        read: true
      });

      const combinedData = [...dynamicSeeds, ...SEED_NOTIFICATIONS].slice(0, 15);

      const batch = writeBatch(db);
      // Clear existing
      const existing = await getDocs(collection(db, 'notifications'));
      existing.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      // Add fresh seed
      for (let i = 0; i < combinedData.length; i++) {
        await addDoc(collection(db, 'notifications'), {
          ...combinedData[i],
          timestamp: serverTimestamp(),
          userId: 'admin',
        });
        // slight delay so timestamps differ
        await new Promise(r => setTimeout(r, 50));
      }
    } catch (e) {
      console.warn('Seed failed (offline mode):', e.message);
      // Use local mock
      setNotifications(SEED_NOTIFICATIONS.map((n, i) => ({
        ...n, id: String(i),
        timestamp: { toMillis: () => Date.now() - i * 90000 }
      })));
    }
    setSeeding(false);
  };

  // ── Filtered list ─────────────────────────────
  const TABS = ['All', 'Critical', 'Warning', 'System', 'Success'];
  const filtered = activeTab === 'All'
    ? notifications
    : notifications.filter(n => n.type === activeTab.toLowerCase());

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Theme vars ────────────────────────────────
  const bg     = isDark ? '#0D1B2A' : '#FFFFFF';
  const bgItem = isDark ? '#0A1628' : '#F7FAFC';
  const bgHov  = isDark ? '#1B2B40' : '#EDF2F7';
  const text   = isDark ? '#FFFFFF' : '#0A1628';
  const muted  = isDark ? '#A0AEC0' : '#4A5568';
  const border = 'rgba(255,69,0,0.4)';

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Bell Button ── */}
      <button
        ref={bellRef}
        className="navbar-icon-btn"
        id="btn-notifications"
        aria-label="Notifications"
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'rgba(255, 69, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: open ? '2px solid #FF4500' : '1px solid rgba(255, 255, 255, 0.2)',
          color: open ? '#FF4500' : '#FFFFFF',
          borderRadius: '8px',
          padding: '8px',
          boxShadow: open ? '0 0 12px rgba(255, 69, 0, 0.4)' : 'none',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge" style={{
            background: '#FF1744',
            color: '#fff',
            boxShadow: '0 0 8px rgba(255, 23, 68, 0.6)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: '52px',
            right: '-8px',
            width: '390px',
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            maxHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
            animation: 'notif-drop 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: text }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#FF1744', color: '#fff', fontSize: '10px',
                  fontWeight: 700, borderRadius: '10px', padding: '2px 7px',
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <button
              onClick={markAllRead}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#00D4FF', fontSize: '12px', fontWeight: 600,
                padding: '4px 8px', borderRadius: '6px',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              Mark all read
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: '4px', padding: '10px 16px 6px',
            borderBottom: `1px solid ${border}`, flexShrink: 0, flexWrap: 'wrap',
          }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '11px',
                  fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: activeTab === tab
                    ? 'rgba(255,69,0,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab ? '#FF4500' : muted,
                  transition: 'all 0.2s',
                }}
              >
                {tab}
                {tab !== 'All' && (() => {
                  const c = notifications.filter(n =>
                    n.type === tab.toLowerCase() && !n.read
                  ).length;
                  return c > 0 ? (
                    <span style={{
                      marginLeft: '5px', background: TYPE_CONFIG[tab.toLowerCase()]?.color,
                      color: '#fff', fontSize: '9px', borderRadius: '8px',
                      padding: '1px 5px', fontWeight: 700,
                    }}>{c}</span>
                  ) : null;
                })()}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: '40px 20px', textAlign: 'center',
                color: muted, fontSize: '13px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                No {activeTab === 'All' ? '' : activeTab.toLowerCase()} notifications
              </div>
            ) : (
              filtered.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && markRead(notif.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '12px 16px',
                      background: notif.read ? 'transparent' : bgItem,
                      borderLeft: `3px solid ${notif.read ? 'transparent' : cfg.border}`,
                      cursor: notif.read ? 'default' : 'pointer',
                      transition: 'background 0.15s',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
                    }}
                    onMouseOver={e => {
                      if (notif.read) e.currentTarget.style.background = bgHov;
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = notif.read ? 'transparent' : bgItem;
                    }}
                  >
                    {/* Unread dot */}
                    <div style={{ paddingTop: '4px', width: '8px', flexShrink: 0 }}>
                      {!notif.read && (
                        <div style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: '#00D4FF',
                          boxShadow: '0 0 6px rgba(0,212,255,0.6)',
                        }} />
                      )}
                    </div>

                    {/* Icon */}
                    <span style={{ fontSize: '18px', flexShrink: 0, paddingTop: '1px' }}>
                      {cfg.icon}
                    </span>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: '12px', color: text,
                        marginBottom: '3px', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {notif.title}
                      </div>
                      <div style={{
                        fontSize: '11px', color: muted, lineHeight: 1.4,
                        marginBottom: '5px',
                      }}>
                        {notif.description}
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, color: cfg.color,
                        background: `${cfg.color}18`, padding: '2px 8px',
                        borderRadius: '10px',
                      }}>
                        📍 {notif.district}
                      </span>
                    </div>

                    {/* Time */}
                    <div style={{
                      fontSize: '10px', color: muted,
                      flexShrink: 0, paddingTop: '3px',
                      whiteSpace: 'nowrap',
                    }}>
                      {timeAgo(notif.timestamp)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — Test Data */}
          <div style={{
            padding: '10px 16px', borderTop: `1px solid ${border}`,
            display: 'flex', justifyContent: 'center', flexShrink: 0,
          }}>
            <button
              onClick={seedNotifications}
              disabled={seeding}
              style={{
                background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                color: '#00D4FF', borderRadius: '8px', fontSize: '11px',
                fontWeight: 600, padding: '6px 16px', cursor: seeding ? 'not-allowed' : 'pointer',
                opacity: seeding ? 0.6 : 1, transition: 'all 0.2s', width: '100%',
              }}
            >
              {seeding ? '⏳ Generating...' : '🗄️ Generate Test Notifications'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
