// ============================================
// CrisisIQ — Firebase Seed Script
// ============================================
// Run this script to populate your Firestore
// with initial sample data for the demo.
// ============================================

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc } from 'firebase/firestore';
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

const zones = [
  { id: 'wayanad', name: 'Wayanad', lat: 11.6854, lng: 76.1320, severity: 'CRITICAL', resources: 0, color: '#FF1744' },
  { id: 'idukki', name: 'Idukki', lat: 9.9189, lng: 77.1025, severity: 'CRITICAL', resources: 2, color: '#FF1744' },
  { id: 'palakkad', name: 'Palakkad', lat: 10.7867, lng: 76.6547, severity: 'HIGH', resources: 3, color: '#FF6D00' },
  { id: 'thrissur', name: 'Thrissur', lat: 10.5276, lng: 76.2144, severity: 'HIGH', resources: 4, color: '#FF6D00' },
  { id: 'malappuram', name: 'Malappuram', lat: 11.0735, lng: 76.0740, severity: 'MEDIUM', resources: 6, color: '#FFB800' },
  { id: 'alappuzha', name: 'Alappuzha', lat: 9.4981, lng: 76.3388, severity: 'MEDIUM', resources: 5, color: '#FFB800' },
  { id: 'kottayam', name: 'Kottayam', lat: 9.5916, lng: 76.5222, severity: 'LOW', resources: 8, color: '#00FF88' },
  { id: 'ernakulam', name: 'Ernakulam', lat: 9.9816, lng: 76.2999, severity: 'LOW', resources: 14, color: '#00FF88' },
];

const resources = [
  { id: 'RES-001', type: 'Medical Unit', district: 'Wayanad', priority: 95, status: 'EN ROUTE' },
  { id: 'RES-002', type: 'Food Supply', district: 'Idukki', priority: 92, status: 'DEPLOYED' },
  { id: 'RES-003', type: 'Rescue Boat', district: 'Palakkad', priority: 88, status: 'EN ROUTE' },
  { id: 'RES-004', type: 'Shelter Kit', district: 'Thrissur', priority: 82, status: 'DEPLOYED' },
  { id: 'RES-005', type: 'Water Purifier', district: 'Malappuram', priority: 75, status: 'STANDBY' },
  { id: 'RES-006', type: 'Generator', district: 'Alappuzha', priority: 70, status: 'EN ROUTE' },
  { id: 'RES-007', type: 'Medical Unit', district: 'Kottayam', priority: 65, status: 'DEPLOYED' },
  { id: 'RES-008', type: 'Food Supply', district: 'Ernakulam', priority: 58, status: 'STANDBY' },
];

const auditLogs = [
  { timestamp: '19:42:18', action: 'Resource reallocation triggered', zone: 'Wayanad', type: 'allocation' },
  { timestamp: '19:38:05', action: 'Bias check passed', zone: 'Idukki', type: 'fairness' },
  { timestamp: '19:35:22', action: 'Priority escalation approved', zone: 'Palakkad', type: 'escalation' },
  { timestamp: '19:31:48', action: 'Supply drop confirmed', zone: 'Thrissur', type: 'allocation' },
  { timestamp: '19:28:11', action: 'Citizen request fulfilled', zone: 'Malappuram', type: 'request' },
  { timestamp: '19:24:36', action: 'New zone activated', zone: 'Alappuzha', type: 'activation' },
  { timestamp: '19:20:02', action: 'Route optimized by AI', zone: 'Kottayam', type: 'optimization' },
];

const citizenRequests = [
  { name: 'Anitha Kumari', priority: 'CRITICAL', location: 'Wayanad — Meppadi', time: '2 min ago' },
  { name: 'Rajesh Menon', priority: 'HIGH', location: 'Idukki — Munnar', time: '8 min ago' },
  { name: 'Priya Nair', priority: 'MEDIUM', location: 'Thrissur — Chalakudy', time: '14 min ago' },
  { name: 'Gopal Das', priority: 'CRITICAL', location: 'Palakkad — Chittur', time: '1 min ago' },
  { name: 'Sumathi S.', priority: 'LOW', location: 'Ernakulam — Aluva', time: '25 min ago' },
];

async function seed() {
  console.log('🚀 Starting Firebase Seeding...');

  // 1. Zones
  for (const zone of zones) {
    await setDoc(doc(db, 'zones', zone.id), zone);
    console.log(`✅ Seeded Zone: ${zone.name}`);
  }

  // 2. Resources
  for (const res of resources) {
    await setDoc(doc(db, 'resources', res.id), res);
    console.log(`✅ Seeded Resource: ${res.id}`);
  }

  // 3. Audit Logs
  for (const log of auditLogs) {
    await addDoc(collection(db, 'audit_log'), log);
  }
  console.log('✅ Seeded Audit Logs');

  // 4. Citizen Requests
  for (const req of citizenRequests) {
    await addDoc(collection(db, 'citizen_requests'), req);
  }
  console.log('✅ Seeded Citizen Requests');

  // 5. Global Stats
  await setDoc(doc(db, 'stats', 'current'), {
    total_resources: 2847,
    active_zones: 14,
    bias_score: 0.23,
    pending_requests: 156,
    estimated_impact: 94.2
  });
  console.log('✅ Seeded Global Stats');

  console.log('✨ Seeding Complete! CrisisIQ is now live with real data.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
