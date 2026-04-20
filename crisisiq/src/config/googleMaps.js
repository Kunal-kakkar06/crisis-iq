// ============================================
// CrisisIQ — Shared Google Maps Configuration
// ============================================
// Centralized config to ensure consistent
// library loading across all map components.
// ============================================

export const GOOGLE_MAPS_LIBRARIES = ['visualization', 'places'];
export const GOOGLE_MAPS_ID = 'crisisiq-map';

// ── Comprehensive Dark Map Style ──────────────────
// Matches app design: #050A14 background, dark blue
// water, very dark gray land, hidden default labels
// except major roads.
export const darkMapStyle = [
  // Base geometry — very dark gray
  { elementType: 'geometry', stylers: [{ color: '#0D1B2A' }] },
  // All labels off by default
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a6380' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0D1B2A' }] },
  // Administrative borders subtle
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1B3A5C' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  // Land — very dark
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#0c1a2e' }] },
  // POI — hide all
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  // Roads — only major roads visible
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#152a42' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0e1f33' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a3554' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0e1f33' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#5a7fa0' }] },
  { featureType: 'road.highway', elementType: 'labels.text', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', stylers: [{ visibility: 'off' }] },
  // Transit — hidden
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Water — dark blue
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050e1d' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2a5082' }] },
];

export const KERALA_CENTER = { lat: 10.8505, lng: 76.2711 };

export const keralaZones = [
  { id: 1, name: 'Wayanad', lat: 11.6854, lng: 76.1320, severity: 'CRITICAL', score: 9.4, resources: 23, need: 85, population: 48200, affected: 12450, severityScore: 94.2, lastUpdated: '2 min ago', color: '#FF1744' },
  { id: 2, name: 'Idukki', lat: 9.9189, lng: 76.9291, severity: 'CRITICAL', score: 9.1, resources: 18, need: 78, population: 35600, affected: 9800, severityScore: 91.0, lastUpdated: '5 min ago', color: '#FF1744' },
  { id: 3, name: 'Palakkad', lat: 10.7867, lng: 76.6548, severity: 'CRITICAL', score: 8.7, resources: 31, need: 72, population: 52100, affected: 8200, severityScore: 87.3, lastUpdated: '3 min ago', color: '#FF1744' },
  { id: 4, name: 'Thrissur', lat: 10.5276, lng: 76.2144, severity: 'HIGH', score: 7.2, resources: 42, need: 58, population: 41300, affected: 5600, severityScore: 72.1, lastUpdated: '8 min ago', color: '#FF6D00' },
  { id: 5, name: 'Malappuram', lat: 11.0510, lng: 76.0711, severity: 'HIGH', score: 6.8, resources: 37, need: 52, population: 38900, affected: 4300, severityScore: 68.4, lastUpdated: '6 min ago', color: '#FF6D00' },
  { id: 6, name: 'Alappuzha', lat: 9.4981, lng: 76.3388, severity: 'HIGH', score: 6.3, resources: 29, need: 45, population: 29700, affected: 3100, severityScore: 63.0, lastUpdated: '10 min ago', color: '#FF6D00' },
  { id: 7, name: 'Kottayam', lat: 9.5916, lng: 76.5222, severity: 'MEDIUM', score: 4.5, resources: 54, need: 35, population: 22400, affected: 1800, severityScore: 45.2, lastUpdated: '15 min ago', color: '#FFB800' },
  { id: 8, name: 'Ernakulam', lat: 9.9816, lng: 76.2999, severity: 'STABLE', score: 2.1, resources: 67, need: 20, population: 15800, affected: 620, severityScore: 21.0, lastUpdated: '20 min ago', color: '#00FF88' },
];

// ── Heatmap intensity data per district ───────────
export const heatmapIntensities = [
  { name: 'Wayanad', lat: 11.6854, lng: 76.1320, intensity: 0.9 },
  { name: 'Idukki', lat: 9.9189, lng: 76.9291, intensity: 0.85 },
  { name: 'Palakkad', lat: 10.7867, lng: 76.6548, intensity: 0.78 },
  { name: 'Thrissur', lat: 10.5276, lng: 76.2144, intensity: 0.62 },
  { name: 'Malappuram', lat: 11.0510, lng: 76.0711, intensity: 0.58 },
  { name: 'Alappuzha', lat: 9.4981, lng: 76.3388, intensity: 0.51 },
  { name: 'Kottayam', lat: 9.5916, lng: 76.5222, intensity: 0.35 },
  { name: 'Ernakulam', lat: 9.9816, lng: 76.2999, intensity: 0.22 },
];
