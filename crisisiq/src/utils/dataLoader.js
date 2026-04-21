// ============================================================
// CrisisIQ — Real Data Loader
// Reads & processes 3 CSV files from /public/data/
// ============================================================
// CSV 1: district_wise_details.csv  — Kerala 2018 flood data
// CSV 2: hospital_directory.csv     — India hospital directory
// CSV 3: aadutui0909_*.csv          — BPL poverty data
// ============================================================

// ── District metadata (coordinates + 3-letter IDs) ─────────
const DISTRICT_META = {
  Thiruvananthapuram: { id: 'TVM', lat: 8.5241,  lng: 76.9366, type: 'urban' },
  Kollam:             { id: 'KLM', lat: 8.8932,  lng: 76.6141, type: 'mixed' },
  Pathanamthitta:     { id: 'PTA', lat: 9.2648,  lng: 76.7870, type: 'rural' },
  Alappuzha:          { id: 'ALP', lat: 9.4981,  lng: 76.3388, type: 'mixed' },
  Kottayam:           { id: 'KTM', lat: 9.5916,  lng: 76.5222, type: 'mixed' },
  Idukki:             { id: 'IDK', lat: 9.9189,  lng: 77.1025, type: 'rural' },
  Ernakulam:          { id: 'EKM', lat: 9.9816,  lng: 76.2999, type: 'urban' },
  Thrissur:           { id: 'TSR', lat: 10.5276, lng: 76.2144, type: 'mixed' },
  Palakkad:           { id: 'PKD', lat: 10.7867, lng: 76.6548, type: 'mixed' },
  Malappuram:         { id: 'MLP', lat: 11.0510, lng: 76.0711, type: 'mixed' },
  Kozhikode:          { id: 'KZD', lat: 11.2588, lng: 75.7804, type: 'urban' },
  Wayanad:            { id: 'WYD', lat: 11.6854, lng: 76.1320, type: 'rural' },
  Kannur:             { id: 'KNR', lat: 11.8745, lng: 75.3704, type: 'mixed' },
  Kasaragode:         { id: 'KSD', lat: 12.4996, lng: 74.9869, type: 'rural' },
};

// Rural districts (use rural BPL %)
const RURAL_DISTRICTS = new Set(['Wayanad', 'Idukki', 'Pathanamthitta', 'Kasaragode']);
// Urban districts (use urban BPL %)
const URBAN_DISTRICTS = new Set(['Ernakulam', 'Thiruvananthapuram', 'Kozhikode']);

// Kerala BPL defaults (fallback)
const DEFAULT_BPL = { rural: 9.14, urban: 4.97, combined: 7.05 };

// Severity label thresholds
function getSeverityLabel(score) {
  if (score >= 80) return { severity: 'CRITICAL', color: '#FF1744' };
  if (score >= 60) return { severity: 'HIGH',     color: '#FF6D00' };
  if (score >= 40) return { severity: 'MEDIUM',   color: '#FFB800' };
  return             { severity: 'STABLE',  color: '#00FF88' };
}

// ── Parse a simple CSV text into array of row-objects ─────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Handle quoted fields properly
  const splitLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    if (vals.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (vals[idx] || '').replace(/^"|"$/g, '').trim();
    });
    rows.push(row);
  }
  return rows;
}

// ── Fetch a CSV file from /public/data/ ──────────────────────
async function fetchCSV(filename) {
  const res = await fetch(`/data/${filename}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${filename}`);
  return res.text();
}

// ── STEP 1: Process district_wise_details.csv ─────────────────
function processDistrictCSV(rows) {
  // Max values for normalization (from specification)
  const MAX_FATALITIES   = 72;
  const MAX_LANDSLIDES   = 143;
  const MAX_HOUSES       = 2889;
  const MAX_CAMPS        = 4352;
  const MAX_RAIN_DIFF    = 1000;

  return rows.map(row => {
    const name     = row['district']                || row['District'] || '';
    const fat      = parseFloat(row['fatalities'])                 || 0;
    const camps    = parseFloat(row['no_of_camps'])                || 0;
    const actRain  = parseFloat(row['actual_rainfall_in_mm'])     || 0;
    const normRain = parseFloat(row['normal_rainfall_in_mm'])     || 0;
    const lands    = parseFloat(row['no_of_landslides'])          || 0;
    const houses   = parseFloat(row['full_damaged_houses'])       || 0;

    const rainDiff = Math.max(0, actRain - normRain);

    const rawScore =
      (fat    / MAX_FATALITIES) * 25 +
      (rainDiff / MAX_RAIN_DIFF) * 25 +
      (lands  / MAX_LANDSLIDES) * 20 +
      (houses / MAX_HOUSES)     * 15 +
      (camps  / MAX_CAMPS)      * 15;

    const severityScore = Math.min(100, Math.round(rawScore * 10) / 10);
    const { severity, color } = getSeverityLabel(severityScore);
    const meta = DISTRICT_META[name] || { id: name.slice(0, 3).toUpperCase(), lat: 10.0, lng: 76.5, type: 'mixed' };

    return {
      name,
      fatalities:        fat,
      reliefCamps:       camps,
      actualRainfall:    actRain,
      normalRainfall:    normRain,
      rainfallDeviation: parseFloat(rainDiff.toFixed(1)),
      landslides:        lands,
      housesAffected:    houses,
      severityScore,
      severity,
      color,
      ...meta,
    };
  }).filter(d => d.name && DISTRICT_META[d.name]);
}

// ── STEP 2: Process hospital_directory.csv ───────────────────
function processHospitalCSV(rows) {
  const keralaRows = rows.filter(r => {
    const state = r['State'] || r['state'] || '';
    return state.toLowerCase() === 'kerala';
  });

  const byDistrict = {};

  keralaRows.forEach(r => {
    const coords = r['Location_Coordinates'] || '';
    if (!coords || coords === 'NA' || coords === '0') return;

    const parts = coords.split(',');
    if (parts.length < 2) return;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return;
    // Basic sanity-check: Kerala is roughly lat 8-13, lng 74-77.5
    if (lat < 7 || lat > 14 || lng < 73 || lng > 78) return;

    const districtRaw = r['District'] || '';
    // Match against our known district names (case-insensitive prefix)
    let district = '';
    for (const known of Object.keys(DISTRICT_META)) {
      if (districtRaw.toLowerCase().includes(known.toLowerCase()) ||
          known.toLowerCase().includes(districtRaw.toLowerCase())) {
        district = known;
        break;
      }
    }
    if (!district) return;

    const bedsRaw = r['Total_Num_Beds'] || '0';
    const beds = parseInt(bedsRaw, 10) || 0;

    const hospital = {
      name:      r['Hospital_Name'] || 'Unknown Hospital',
      lat,
      lng,
      emergency: r['Emergency_Num']      || '',
      ambulance: r['Ambulance_Phone_No'] || '108',
      beds,
      district,
    };

    if (!byDistrict[district]) byDistrict[district] = [];
    byDistrict[district].push(hospital);
  });

  // Sort each district by beds desc, keep top 5
  const result = {};
  for (const [dist, list] of Object.entries(byDistrict)) {
    result[dist] = list
      .sort((a, b) => b.beds - a.beds)
      .slice(0, 5);
  }
  return result;
}

// ── STEP 3: Process BPL CSV ─────────────────────────────────
function processBPLCSV(rows) {
  const stateCol  = 'States Or Uts Or Other';
  const yearCol   = 'Year';
  const typeCol   = 'Type Of Residence '; // note trailing space in CSV
  const pctCol    = 'Percentage Of The Persons Below The Poverty Line (UOM:%(Percentage)), Scaling Factor:1';

  const kerala2011 = rows.filter(r => {
    const state = (r[stateCol] || '').trim();
    const year  = (r[yearCol]  || '').toString();
    return state === 'Kerala' && year.includes('2011');
  });

  let rural = DEFAULT_BPL.rural;
  let urban = DEFAULT_BPL.urban;
  let combined = DEFAULT_BPL.combined;

  for (const row of kerala2011) {
    const type = (row[typeCol] || '').trim().toLowerCase();
    const pct  = parseFloat(row[pctCol] || '0');
    if (!isNaN(pct) && pct > 0) {
      if (type === 'rural')    rural    = pct;
      if (type === 'urban')    urban    = pct;
      if (type === 'combined') combined = pct;
    }
  }

  return { rural, urban, combined };
}

// ── STEP 4: Combine into unified zone objects ─────────────────
function combineData(districtData, hospitalsByDistrict, bpl) {
  return districtData.map((d, idx) => {
    const bplPct = RURAL_DISTRICTS.has(d.name)
      ? bpl.rural
      : URBAN_DISTRICTS.has(d.name)
        ? bpl.urban
        : bpl.combined;

    const hospitals = hospitalsByDistrict[d.name] || [];

    // Simulate resources based on severity (inverse relationship)
    const resourcesAvailable = Math.max(2,
      Math.round(20 - (d.severityScore / 100) * 15) + Math.floor(Math.random() * 3)
    );

    // Progress need (higher severity = higher need)
    const need = Math.round((d.severityScore / 100) * 80 + 20);

    return {
      id:                d.id,
      name:              d.name,
      lat:               d.lat,
      lng:               d.lng,
      severityScore:     d.severityScore,
      severity:          d.severity,
      color:             d.color,
      fatalities:        d.fatalities,
      reliefCamps:       d.reliefCamps,
      actualRainfall:    d.actualRainfall,
      normalRainfall:    d.normalRainfall,
      rainfallDeviation: d.rainfallDeviation,
      landslides:        d.landslides,
      housesAffected:    d.housesAffected,
      bplPercent:        bplPct,
      resourcesAvailable,
      resources:         resourcesAvailable,   // alias for ResourceMap compatibility
      need,
      hospitals:         hospitals.map(h => ({
        name:      h.name,
        lat:       h.lat,
        lng:       h.lng,
        emergency: h.emergency,
        ambulance: h.ambulance,
        beds:      h.beds,
      })),
      lastUpdated: `${Math.floor(Math.random() * 15) + 1} min ago`,
    };
  }).sort((a, b) => b.severityScore - a.severityScore);
}

// ── Module-level cache ────────────────────────────────────────
let _cachedZones    = null;
let _cachedHospitals = null;
let _cachedStats    = null;
let _usingFallback  = false;

// ── Fallback hardcoded data (when CSVs unavailable) ───────────
function buildFallbackZones() {
  _usingFallback = true;
  // Hardcoded minimal Kerala data derived from the spec
  const fallback = [
    { name: 'Thrissur',         fatalities: 72, reliefCamps: 1513, actualRainfall: 734.7,  normalRainfall: 440.1, landslides: 26, housesAffected: 2889 },
    { name: 'Idukki',           fatalities: 54, reliefCamps: 363,  actualRainfall: 1478.9, normalRainfall: 527.3, landslides: 143,housesAffected: 1166 },
    { name: 'Ernakulam',        fatalities: 58, reliefCamps: 1582, actualRainfall: 648.3,  normalRainfall: 401.3, landslides: 0,  housesAffected: 615  },
    { name: 'Alappuzha',        fatalities: 43, reliefCamps: 2126, actualRainfall: 608.2,  normalRainfall: 343.1, landslides: 0,  housesAffected: 2075 },
    { name: 'Malappuram',       fatalities: 30, reliefCamps: 213,  actualRainfall: 913.7,  normalRainfall: 395.3, landslides: 30, housesAffected: 500  },
    { name: 'Palakkad',         fatalities: 20, reliefCamps: 165,  actualRainfall: 848.8,  normalRainfall: 333.8, landslides: 20, housesAffected: 1118 },
    { name: 'Kozhikode',        fatalities: 16, reliefCamps: 399,  actualRainfall: 836.0,  normalRainfall: 500.9, landslides: 9,  housesAffected: 107  },
    { name: 'Kottayam',         fatalities: 14, reliefCamps: 788,  actualRainfall: 619.2,  normalRainfall: 386.0, landslides: 29, housesAffected: 76   },
    { name: 'Thiruvananthapuram',fatalities:11, reliefCamps: 94,   actualRainfall: 373.8,  normalRainfall: 142.0, landslides: 0,  housesAffected: 111  },
    { name: 'Kollam',           fatalities: 5,  reliefCamps: 168,  actualRainfall: 644.1,  normalRainfall: 258.7, landslides: 2,  housesAffected: 95   },
    { name: 'Wayanad',          fatalities: 6,  reliefCamps: 451,  actualRainfall: 1053.5, normalRainfall: 592.9, landslides: 47, housesAffected: 702  },
    { name: 'Pathanamthitta',   fatalities: 3,  reliefCamps: 4352, actualRainfall: 764.9,  normalRainfall: 352.7, landslides: 8,  housesAffected: 741  },
    { name: 'Kannur',           fatalities: 6,  reliefCamps: 37,   actualRainfall: 665.3,  normalRainfall: 540.9, landslides: 17, housesAffected: 121  },
    { name: 'Kasaragode',       fatalities: 1,  reliefCamps: 2,    actualRainfall: 636.9,  normalRainfall: 636.3, landslides: 0,  housesAffected: 3    },
  ];

  const rows = fallback.map(r => ({
    district: r.name,
    fatalities: String(r.fatalities),
    no_of_camps: String(r.reliefCamps),
    actual_rainfall_in_mm: String(r.actualRainfall),
    normal_rainfall_in_mm: String(r.normalRainfall),
    no_of_landslides: String(r.landslides),
    full_damaged_houses: String(r.housesAffected),
  }));

  const districtData = processDistrictCSV(rows);
  return combineData(districtData, {}, DEFAULT_BPL);
}

// ── Main loader (cached) ──────────────────────────────────────
async function loadAllData() {
  if (_cachedZones) return _cachedZones;

  let districtText = '';
  let hospitalText  = '';
  let bplText       = '';

  try {
    [districtText, hospitalText, bplText] = await Promise.all([
      fetchCSV('district_wise_details.csv'),
      fetchCSV('hospital_directory.csv'),
      fetchCSV('aadutui0909_1776632876745489.csv'),
    ]);
  } catch (err) {
    console.warn('[CrisisIQ DataLoader] CSV load failed, using fallback:', err.message);
    _cachedZones    = buildFallbackZones();
    _cachedHospitals = {};
    _cachedStats    = buildStats(_cachedZones);
    return _cachedZones;
  }

  try {
    const districtRows = parseCSV(districtText);
    const hospitalRows = parseCSV(hospitalText);
    const bplRows      = parseCSV(bplText);

    const districtData    = processDistrictCSV(districtRows);
    const hospitalsByDist = processHospitalCSV(hospitalRows);
    const bpl             = processBPLCSV(bplRows);

    _cachedZones    = combineData(districtData, hospitalsByDist, bpl);
    _cachedHospitals = hospitalsByDist;
    _cachedStats    = buildStats(_cachedZones);

    console.info('[CrisisIQ DataLoader] Loaded real CSV data for', _cachedZones.length, 'districts');
  } catch (err) {
    console.error('[CrisisIQ DataLoader] Parse error, using fallback:', err.message);
    _cachedZones    = buildFallbackZones();
    _cachedHospitals = {};
    _cachedStats    = buildStats(_cachedZones);
  }

  return _cachedZones;
}

// ── Build summary stats ───────────────────────────────────────
function buildStats(zones) {
  const totalFatalities    = zones.reduce((s, z) => s + z.fatalities,    0);
  const totalHousesAffected = zones.reduce((s, z) => s + z.housesAffected, 0);
  const totalReliefCamps   = zones.reduce((s, z) => s + z.reliefCamps,   0);
  const top = zones.slice().sort((a, b) => b.severityScore - a.severityScore)[0];
  return {
    totalFatalities,
    totalHousesAffected,
    totalReliefCamps,
    mostAffectedDistrict: top?.name || 'Thrissur',
    mostAffectedScore:    top?.severityScore || 0,
    keralaRuralBPL:  DEFAULT_BPL.rural,
    keralaUrbanBPL:  DEFAULT_BPL.urban,
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Returns array of 14 Kerala district zone objects.
 * Cached after first call.
 */
export async function getKeralaZones() {
  return loadAllData();
}

/**
 * Returns top hospitals for a given district name.
 * @param {string} districtName
 */
export async function getHospitals(districtName) {
  await loadAllData(); // ensure loaded
  if (!_cachedHospitals) return [];
  return _cachedHospitals[districtName] || [];
}

/**
 * Returns national/state-level summary statistics.
 */
export async function getNationalStats() {
  await loadAllData();
  return _cachedStats || buildStats([]);
}

/**
 * Whether we are running on fallback (CSV not found).
 */
export function isUsingFallback() {
  return _usingFallback;
}

/**
 * Synchronous getter after zones are loaded — returns null if not ready.
 */
export function getZonesSync() {
  return _cachedZones;
}
