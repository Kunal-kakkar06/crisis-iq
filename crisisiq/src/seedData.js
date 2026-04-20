import { db } from './firebase';
import { collection, setDoc, doc, writeBatch } from 'firebase/firestore';

const mockZones = [
  { id: 'zone-1', name: 'Wayanad', lat: 11.6854, lng: 76.132, severity: 'CRITICAL', score: 9.8, resources: 2, color: '#FF1744' },
  { id: 'zone-2', name: 'Idukki', lat: 9.85, lng: 76.95, severity: 'HIGH', score: 8.4, resources: 4, color: '#FF6D00' },
  { id: 'zone-3', name: 'Palakkad', lat: 10.7867, lng: 76.6548, severity: 'HIGH', score: 7.9, resources: 6, color: '#FF6D00' },
  { id: 'zone-4', name: 'Thrissur', lat: 10.5276, lng: 76.2144, severity: 'MEDIUM', score: 6.2, resources: 8, color: '#FFB800' },
  { id: 'zone-5', name: 'Malappuram', lat: 11.0733, lng: 76.074, severity: 'MEDIUM', score: 5.8, resources: 7, color: '#FFB800' },
  { id: 'zone-6', name: 'Alappuzha', lat: 9.4981, lng: 76.3388, severity: 'LOW', score: 3.4, resources: 12, color: '#00FF88' },
  { id: 'zone-7', name: 'Kottayam', lat: 9.5916, lng: 76.5222, severity: 'LOW', score: 2.9, resources: 10, color: '#00FF88' },
  { id: 'zone-8', name: 'Ernakulam', lat: 9.9816, lng: 76.2999, severity: 'LOW', score: 1.5, resources: 14, color: '#00FF88' },
];

const mockResources = [
  { id: 'RES-001', type: 'Medical Unit', district: 'Wayanad', priority: 'CRITICAL', status: 'EN ROUTE' },
  { id: 'RES-002', type: 'Food Supply', district: 'Idukki', priority: 'CRITICAL', status: 'DEPLOYED' },
  { id: 'RES-003', type: 'Rescue Boat', district: 'Palakkad', priority: 'CRITICAL', status: 'EN ROUTE' },
  { id: 'RES-004', type: 'Shelter Kit', district: 'Thrissur', priority: 'HIGH', status: 'DEPLOYED' },
  { id: 'RES-005', type: 'Water Purifier', district: 'Malappuram', priority: 'HIGH', status: 'STANDBY' },
  { id: 'RES-006', type: 'Generator', district: 'Alappuzha', priority: 'HIGH', status: 'EN ROUTE' },
  { id: 'RES-007', type: 'Medical Unit', district: 'Kottayam', priority: 'MEDIUM', status: 'DEPLOYED' },
  { id: 'RES-008', type: 'Food Supply', district: 'Ernakulam', priority: 'MEDIUM', status: 'STANDBY' },
];

const mockAuditLogs = [
  { id: '1', timestamp: '19:42:18', action: 'Rerouted', resourceId: 'AMB-001', from: 'Ernakulam', to: 'Wayanad', reason: 'High demand spike', isOverride: false, isBiasFlag: false, zone: 'Wayanad', type: 'allocation' },
  { id: '2', timestamp: '19:38:05', action: 'Deployed', resourceId: 'MED-047', from: 'Depot', to: 'Thrissur', reason: 'Critical patient count', isOverride: false, isBiasFlag: false, zone: 'Idukki', type: 'fairness' },
  { id: '3', timestamp: '19:35:22', action: 'Reallocated', resourceId: 'SHE-012', from: 'Kottayam', to: 'Idukki', reason: 'Fairness rebalancing', isOverride: false, isBiasFlag: true, zone: 'Palakkad', type: 'escalation' },
  { id: '4', timestamp: '19:31:48', action: 'Override', resourceId: 'ALL-003', from: 'Wayanad', to: 'Ernakulam', reason: 'Coordinator manual', isOverride: true, isBiasFlag: true, zone: 'Thrissur', type: 'allocation' },
  { id: '5', timestamp: '19:28:11', action: 'Deployed', resourceId: 'FOD-089', from: 'Depot', to: 'Alappuzha', reason: 'Scheduled supply run', isOverride: false, isBiasFlag: false, zone: 'Malappuram', type: 'request' },
  { id: '6', timestamp: '19:24:36', action: 'Deployed', resourceId: 'WAT-011', from: 'Depot', to: 'Palakkad', reason: 'Water shortage alert', isOverride: false, isBiasFlag: false, zone: 'Alappuzha', type: 'activation' },
  { id: '7', timestamp: '19:20:02', action: 'Rerouted', resourceId: 'ENG-005', from: 'Malappuram', to: 'Kottayam', reason: 'Road block clearance', isOverride: false, isBiasFlag: false, zone: 'Kottayam', type: 'optimization' },
  { id: '8', timestamp: '18:58:44', action: 'Override', resourceId: 'MED-012', from: 'Thrissur', to: 'Idukki', reason: 'VIP escort override', isOverride: true, isBiasFlag: true, zone: 'Idukki', type: 'escalation' },
  { id: '9', timestamp: '18:50:12', action: 'Reallocated', resourceId: 'SHE-004', from: 'Ernakulam', to: 'Wayanad', reason: 'Fairness matching logic', isOverride: false, isBiasFlag: true, zone: 'Wayanad', type: 'fairness' },
  { id: '10', timestamp: '18:45:00', action: 'Deployed', resourceId: 'AMB-021', from: 'Depot', to: 'Malappuram', reason: 'Standard response', isOverride: false, isBiasFlag: false, zone: 'Malappuram', type: 'allocation' },
  { id: '11', timestamp: '18:30:15', action: 'Rerouted', resourceId: 'FOD-102', from: 'Palakkad', to: 'Alappuzha', reason: 'Flood warning updated', isOverride: false, isBiasFlag: false, zone: 'Alappuzha', type: 'optimization' },
  { id: '12', timestamp: '18:15:05', action: 'Override', resourceId: 'ALL-014', from: 'Depot', to: 'Ernakulam', reason: 'Manual dispatcher', isOverride: true, isBiasFlag: false, zone: 'Ernakulam', type: 'escalation' },
];

const mockRequests = [
  { id: '1', name: 'Anitha Kumari', priority: 'CRITICAL', location: 'Wayanad — Meppadi', time: '2 min ago', type: 'Medical Emergency', timestamp: new Date().toISOString() },
  { id: '2', name: 'Rajesh Menon', priority: 'HIGH', location: 'Idukki — Munnar', time: '8 min ago', type: 'Shelter Needed', timestamp: new Date(Date.now() - 480000).toISOString() },
  { id: '3', name: 'Priya Nair', priority: 'MEDIUM', location: 'Thrissur — Chalakudy', time: '14 min ago', type: 'Food & Water', timestamp: new Date(Date.now() - 840000).toISOString() },
  { id: '4', name: 'Arun Kumar', priority: 'CRITICAL', location: 'Wayanad — Kalpetta', time: '20 min ago', type: 'Flood Rescue', timestamp: new Date(Date.now() - 1200000).toISOString() },
  { id: '5', name: 'Meena Thomas', priority: 'LOW', location: 'Ernakulam — Kochi', time: '30 min ago', type: 'Power Outage', timestamp: new Date(Date.now() - 1800000).toISOString() },
];

const mockStats = {
  total_resources: 2847,
  active_zones: 14,
  bias_score: 0.23,
  pending_requests: 156,
  estimated_impact: 94.2
};

export async function seedDatabase() {
  console.log('Seeding Database...');
  try {
    const batch = writeBatch(db);

    mockZones.forEach(zone => {
      const docRef = doc(db, 'zones', zone.id);
      batch.set(docRef, zone);
    });

    mockResources.forEach(res => {
      const docRef = doc(db, 'resources', res.id);
      batch.set(docRef, res);
    });

    mockAuditLogs.forEach(log => {
      const docRef = doc(db, 'audit_log', log.id);
      batch.set(docRef, log);
    });

    mockRequests.forEach(req => {
      const docRef = doc(db, 'citizen_requests', req.id);
      batch.set(docRef, req);
    });

    const statsRef = doc(db, 'stats', 'dashboard_stats');
    batch.set(statsRef, mockStats);

    await batch.commit();
    console.log('Database seeded successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}
