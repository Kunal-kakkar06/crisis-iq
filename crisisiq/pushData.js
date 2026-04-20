// ============================================
// CrisisIQ — Data Migration Script (pushData.js)
// ============================================
// Run with: node pushData.js
// ============================================

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, Timestamp } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── 1. ZONES DATA ────────────────────────────
const zones = {
  'WYD': { name: 'Wayanad', severity: 'CRITICAL', severity_score: 0.94, affected_population: 14200, casualties: 24, resources_assigned: 2, lat: 11.6854, lng: 76.1320, last_updated: Timestamp.now() },
  'IDK': { name: 'Idukki', severity: 'CRITICAL', severity_score: 0.89, affected_population: 9800, casualties: 18, resources_assigned: 3, lat: 9.9189, lng: 77.1025, last_updated: Timestamp.now() },
  'PKD': { name: 'Palakkad', severity: 'HIGH', severity_score: 0.78, affected_population: 12500, casualties: 12, resources_assigned: 5, lat: 10.7867, lng: 76.6547, last_updated: Timestamp.now() },
  'TSR': { name: 'Thrissur', severity: 'HIGH', severity_score: 0.72, affected_population: 15600, casualties: 8, resources_assigned: 8, lat: 10.5276, lng: 76.2144, last_updated: Timestamp.now() },
  'MLP': { name: 'Malappuram', severity: 'MEDIUM', severity_score: 0.58, affected_population: 21000, casualties: 5, resources_assigned: 12, lat: 11.0735, lng: 76.0740, last_updated: Timestamp.now() },
  'ALP': { name: 'Alappuzha', severity: 'MEDIUM', severity_score: 0.52, affected_population: 18400, casualties: 4, resources_assigned: 9, lat: 9.4981, lng: 76.3388, last_updated: Timestamp.now() },
  'KTM': { name: 'Kottayam', severity: 'LOW', severity_score: 0.35, affected_population: 11200, casualties: 0, resources_assigned: 14, lat: 9.5916, lng: 76.5222, last_updated: Timestamp.now() },
  'EKM': { name: 'Ernakulam', severity: 'LOW', severity_score: 0.28, affected_population: 42000, casualties: 2, resources_assigned: 22, lat: 9.9816, lng: 76.2999, last_updated: Timestamp.now() },
};

// ── 2. RESOURCES DATA ────────────────────────
const resources = [
  { id: 'RES-X1', type: 'Medical Unit', zone: 'WYD', priority_score: 0.98, status: 'EN ROUTE' },
  { id: 'RES-X2', type: 'Rescue Boat', zone: 'IDK', priority_score: 0.95, status: 'DEPLOYED' },
  { id: 'RES-X3', type: 'Supply Drone', zone: 'PKD', priority_score: 0.88, status: 'EN ROUTE' },
  { id: 'RES-X4', type: 'Shelter Module', zone: 'TSR', priority_score: 0.84, status: 'DEPLOYED' },
  { id: 'RES-X5', type: 'Water Purifier', zone: 'MLP', priority_score: 0.78, status: 'STANDBY' },
  { id: 'RES-X6', type: 'Medical Unit', zone: 'ALP', priority_score: 0.72, status: 'EN ROUTE' },
  { id: 'RES-X7', type: 'Rescue Boat', zone: 'KTM', priority_score: 0.65, status: 'DEPLOYED' },
  { id: 'RES-X8', type: 'Food Supply', zone: 'EKM', priority_score: 0.55, status: 'STANDBY' },
];

// ── 3. AUDIT LOGS data ───────────────────────
const auditLogs = [
  { timestamp: '2026-04-19T14:22:18', resource: 'RES-X1', action: 'REALLOCATION', from_zone: 'EKM', to_zone: 'WYD', reason: 'Critical medical shortage detected', override: false, bias_flag: false },
  { timestamp: '2026-04-19T14:18:05', resource: 'RES-X3', action: 'DEPLOYMENT', from_zone: 'BASE', to_zone: 'PKD', reason: 'Priority escalation in Chittur', override: true, bias_flag: false },
  { timestamp: '2026-04-19T14:15:22', resource: 'AI-CORE', action: 'FAIRNESS_CHECK', from_zone: 'GLOBAL', to_zone: 'GLOBAL', reason: 'Drift detected in rural allocation', override: false, bias_flag: true },
  { timestamp: '2026-04-19T14:10:48', resource: 'RES-X2', action: 'RESCUE_CONFIRM', from_zone: 'IDK', to_zone: 'IDK', reason: 'Stranded victims rescued in Munnar', override: false, bias_flag: false },
  { timestamp: '2026-04-19T14:05:11', resource: 'RES-X5', action: 'STANDBY', from_zone: 'MLP', to_zone: 'MLP', reason: 'Water toxicity levels normalized', override: false, bias_flag: false },
  { timestamp: '2026-04-19T13:58:34', resource: 'RES-X4', action: 'DEPLOYMENT', from_zone: 'EKM', to_zone: 'TSR', reason: 'New shelter zone requirement', override: false, bias_flag: false },
  { timestamp: '2026-04-19T13:52:00', resource: 'RES-X6', action: 'EN_ROUTE', from_zone: 'BASE', to_zone: 'ALP', reason: 'Flood line advance prediction', override: false, bias_flag: false },
  { timestamp: '2026-04-19T13:45:11', resource: 'AI-CORE', action: 'OPTIMIZATION', from_zone: 'KTM', to_zone: 'KTM', reason: 'Fuel efficiency optimization', override: false, bias_flag: false },
  { timestamp: '2026-04-19T13:38:09', resource: 'RES-X8', action: 'STANDBY', from_zone: 'EKM', to_zone: 'EKM', reason: 'Urban supply cap reached', override: false, bias_flag: false },
  { timestamp: '2026-04-19T13:30:45', resource: 'RES-X7', action: 'DEPLOYMENT', from_zone: 'BASE', to_zone: 'KTM', reason: 'River level warning', override: false, bias_flag: false },
  { timestamp: '2026-04-19T13:22:12', resource: 'RES-X1', action: 'INITIAL_LOAD', from_zone: 'HUB', to_zone: 'EKM', reason: 'Morning shift initialization', override: false, bias_flag: false },
  { timestamp: '2026-04-19T13:15:00', resource: 'AI-CORE', action: 'BOOT', from_zone: 'SYS', to_zone: 'SYS', reason: 'System startup', override: false, bias_flag: false },
];

// ── 4. CITIZEN REQUESTS ──────────────────────
const citizenRequests = [
  { name: 'Anitha Kumari', location: 'Wayanad — Meppadi', priority: 'CRITICAL', message: 'Hospital evacuated, need urgent oxygen supply units.', time_ago: '2 min ago' },
  { name: 'Rajesh Menon', location: 'Idukki — Munnar', priority: 'HIGH', message: 'Bridge collapsed, 14 families stranded on east side.', time_ago: '8 min ago' },
  { name: 'Priya Nair', location: 'Thrissur — Chalakudy', priority: 'MEDIUM', message: 'Supplies running low at local rescue camp.', time_ago: '14 min ago' },
  { name: 'Gopal Das', location: 'Palakkad — Chittur', priority: 'CRITICAL', message: 'Water levels rising rapidly in low-lying area.', time_ago: '1 min ago' },
  { name: 'Sumathi S.', location: 'Ernakulam — Aluva', priority: 'LOW', message: 'Requesting waste management unit for damp debris.', time_ago: '25 min ago' },
];

async function pushData() {
  console.log('🚀 Initializing CrisisIQ Cloud Sync...');

  try {
    // 1. Zones
    for (const [id, data] of Object.entries(zones)) {
      await setDoc(doc(db, 'zones', id), data);
      console.log(`✅ District Uploaded: ${data.name} (${id})`);
    }

    // 2. Resources
    for (const res of resources) {
      await setDoc(doc(db, 'resources', res.id), res);
      console.log(`✅ Resource Logged: ${res.id}`);
    }

    // 3. Audit Logs
    for (const log of auditLogs) {
      await addDoc(collection(db, 'audit_log'), log);
    }
    console.log('✅ Audit Logs Synchronized (12 entries)');

    // 4. Citizen Requests
    for (const req of citizenRequests) {
      await addDoc(collection(db, 'citizen_requests'), req);
    }
    console.log('✅ Citizen SOS Requests Active (5 entries)');

    // 5. Global Stats
    await setDoc(doc(db, 'stats', 'live'), {
      total_resources: 2847,
      active_zones: 14,
      bias_score: 0.23,
      pending_requests: 156,
      estimated_impact: 94.2,
      last_sync: Timestamp.now()
    });
    console.log('✨ SYSTEM ONLINE: Global metrics synchronized.');

    console.log('\n🌟 CrisisIQ Firestore Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Data Push Failed:', error);
    process.exit(1);
  }
}

pushData();
