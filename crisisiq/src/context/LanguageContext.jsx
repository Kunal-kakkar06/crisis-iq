import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', native: 'मराఠी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'brx', name: 'Bodo', native: 'बड़ो' },
  { code: 'doi', name: 'Dogri', native: 'डोगरी' },
  { code: 'ks', name: 'Kashmiri', native: 'कॉशुर' },
  { code: 'mni', name: 'Manipuri', native: 'মৈতৈলোন্' },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
];

const en = {
  // Navigation & Sidebar
  dashboard: 'Dashboard',
  resourceMap: 'Resource Map',
  allocationEngine: 'Allocation Engine',
  fairnessAnalytics: 'Fairness Analytics',
  transparencyLog: 'Transparency Log',
  citizenRequests: 'Citizen Requests',
  offlineCached: 'Offline — cached data',
  systemVersion: 'System v2.4.1',
  poweredBy: 'Powered by',

  // Global UI
  crisisModeActive: 'Crisis Mode Active',
  demoMode: 'Demo Mode',
  deactivateCrisis: 'Deactivate Crisis',
  fairnessOn: 'Fairness On',
  fairnessOff: 'Fairness Off',
  demoBanner: 'Demo Mode — Live data unavailable. Using cached local predictions.',
  live: 'LIVE',
  back: 'Back',
  recent: 'recent',
  vsLastHour: 'vs last hour',
  available: 'available',
  people: 'people',
  units: 'units',

  // Dashboard Stat Cards
  totalFatalities: 'Total Fatalities',
  housesAffected: 'Houses Affected',
  biasScore: 'Bias Score',
  reliefCamps: 'Relief Camps',
  estimatedImpact: 'Estimated Impact',
  mostAffected: 'Most affected',
  floodData: 'Kerala 2018 flood data',
  improved: 'improved',
  activeDistricts: 'Active across all districts',
  efficiency: 'efficiency',
  dataSource: 'Data source: Kerala 2018 Flood Data + India Hospital Directory',

  // Audit Feed
  audit: {
    resourceReallocationTriggered: 'Resource reallocation triggered',
    biasCheckPassed: 'Bias check passed',
    priorityEscalationApproved: 'Priority escalation approved',
    supplyDropConfirmed: 'Supply drop confirmed',
    citizenRequestFulfilled: 'Citizen request fulfilled',
    newZoneActivated: 'New zone activated',
    routeOptimizedByAi: 'Route optimized by AI',
  },

  // Resource Types
  resourceTypes: {
    medicalUnit: 'Medical Unit',
    searchAndRescue: 'Search & Rescue',
    foodSupply: 'Food Supply',
    waterTanker: 'Water Tanker',
    engineeringTeam: 'Engineering Team',
    shelterKit: 'Shelter Kit',
    ambulance: 'Ambulance',
    policeSupport: 'Police Support',
  },

  // Statuses
  status: {
    deployed: 'DEPLOYED',
    standby: 'STANDBY',
    transit: 'TRANSIT',
    inactive: 'INACTIVE',
    enroute: 'EN ROUTE',
  },

  // Panels
  tacticalOverview: 'Tactical Overview — Kerala',
  expandTacticalView: 'Expand Tactical View',
  fairnessSummary: 'Fairness Summary',
  beforeAllocation: 'Before Allocation',
  afterAllocation: 'After Allocation',
  biasReducedBy: 'Bias reduced by',
  transparencyAudit: 'Transparency Audit',

  // Resource Map
  resourceType: 'Resource Type',
  severity: 'Severity',
  district: 'District',
  resetView: 'Reset View',
  zoneStatus: 'Zone Status',
  mapLegend: 'Map Legend',
  criticalSeverity: 'Critical Severity',
  highSeverity: 'High Severity',
  mediumSeverity: 'Medium Severity',
  stableArea: 'Stable Area',
  resourceRoute: 'Resource Route',
  all: 'All',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  stable: 'Stable',
  fatalities: 'Fatalities',
  rainfallExcess: 'Rainfall excess',
  landslides: 'Landslides',
  nearestHospital: 'Nearest hospital',
  viewDetails: 'View Details',
  loadingTacticalMap: 'Loading Tactical Map...',
  requiresValidApiKey: 'Requires valid API Key',

  // Allocation Engine
  responseTime: 'Response Time',
  resourceWaste: 'Resource Waste',
  minAvg: 'min avg',
  improvementVsBaseline: 'improvement vs baseline',
  predictiveResourceLoad: 'Predictive Resource Load — Next 6 Hours',
  next6Hours: 'Next 6 Hours',
  currentLoad: 'Current Load',
  predicted: 'Predicted',
  resourceAllocation: 'Resource Allocation',
  active: 'Active',
  resourceId: 'Resource ID',
  type: 'Type',
  assignedDistrict: 'Assigned District',
  priorityScore: 'Priority Score',
  running: 'Running...',
  runAllocation: 'Run Allocation',
  autoOptimisationActive: 'Auto-optimisation active',
  nextCycleIn: 'next cycle in',
  forecastPoweredByVertexAi: 'Forecast powered by Google Cloud Vertex AI',
  vertexAiModelInfo: 'Vertex AI model v3.2.1 — last trained 4h ago',
  resourcesMonitored: 'resources monitored',

  // Fairness Analytics
  enableFairAllocation: 'Enable Fair Allocation',
  systemBiasScore: 'System Bias Score',
  previousScore: 'Previous',
  highBias: 'High Bias',
  lowBias: 'Low Bias',
  withinAcceptableRange: 'within acceptable range',
  actionRequired: 'action required',
  fair: 'Fair',
  biased: 'Biased',
  distributionEquity: 'Distribution Equity',
  urbanBpl: 'URBAN BPL',
  ruralBpl: 'RURAL BPL',
  combined: 'COMBINED',
  populationDensityVsResources: 'Population Density vs Resources',
  optimalBalanceAchieved: 'Optimal balance achieved',
  infrastructureAccess: 'Infrastructure Access',
  limited: 'Limited',
  responseTimeDrift: 'Response Time Drift',
  urban: 'Urban',
  rural: 'Rural',
  suburban: 'Suburban',
  realTimeTracking: 'Real-time tracking',
  aiNaturalLanguageInsights: 'AI Natural Language Insights',
  resourcesReallocatedToUnderservedAreas: 'Resources reallocated to underserved areas',
  biasReductionTitle: 'Bias Reduction — Before vs After Fair Allocation',
  keralaBplDataInfo: 'Kerala BPL 2011 Data',
  ruralPenaltyNote: '-2.6 min rural penalty — being addressed',
  districts6to8: 'Districts 6-8',

  // Transparency Log
  filter: 'Filter',
  exportToGoogleSheets: 'Export to Google Sheets',
  totalDecisions: 'Total Decisions',
  humanOverrides: 'Human Overrides',
  biasFlags: 'Bias Flags',
  showOverridesOnly: 'Show Overrides Only',
  showBiasFlags: 'Show Bias Flags',
  liveAuditStream: 'Live Audit Stream',
  timestamp: 'Timestamp',
  fromTo: 'From → To',
  reason: 'Reason',
  flags: 'Flags',
  humanOverride: 'Human Override',
  potentialBiasDetected: 'Potential Bias Detected',
  previous: 'Previous',
  next: 'Next',
  showing: 'Showing',
  decisions: 'decisions',
  of: 'of',
  to: 'to',
  rerouted: 'Rerouted',
  deployed: 'Deployed',
  reallocated: 'Reallocated',
  override: 'Override',

  // Citizen Requests
  selectLocation: 'Select Location',
  provideExactLocation: 'Provide your exact location for the rescue team.',
  startTypingLocation: 'Start typing location...',
  sendEmergencyAlert: 'Send Emergency Alert',
  cancel: 'Cancel',
  sendingSosAlert: 'Sending SOS Alert',
  pinpointingCoordinates: 'Pinpointing coordinates for',
  yourLocation: 'your location',
  sosReceived: 'SOS Received',
  dispatchingNearestUnit: 'Dispatching nearest unit to your location via Google Maps.',
  acknowledge: 'Acknowledge',
  sosINeedHelp: 'SOS — I Need Help',
  searchRequests: 'Search requests...',
  voiceReportsSupported: 'Voice reports supported',
  voiceReportsSubtext: 'citizens can submit audio reports in Malayalam, Hindi or English via Google Speech-to-Text.',
  realTimeCommunityAssistance: 'Real-time community assistance requests',
  assignResource: 'Assign Resource',
  viewOnMap: 'View on Map',
  requestDensityMap: 'Request Density Map',
  sectorHealthIndicators: 'Sector Health Indicators',

  // Settings Panel
  settings: 'Settings',
  general: 'General',
  notifications: 'Notifications',
  theme: 'Theme',
  languageRegion: 'Language & Region',
  language: 'Language',
  account: 'Account',
  about: 'About',
  selectLanguage: 'Select Language',
  activeLanguage: 'Active Language',
  resetToEnglish: 'Reset to English',
};

const hi = {
  // Navigation & Sidebar
  dashboard: 'डैशबोर्ड',
  resourceMap: 'संसाधन मानचित्र',
  allocationEngine: 'आवंटन इंजन',
  fairnessAnalytics: 'निष्पक्षता विश्लेषण',
  transparencyLog: 'पारदर्शिता लॉग',
  citizenRequests: 'नागरिक अनुरोध',
  offlineCached: 'ऑफ़लाइन — कैश्ड डेटा',
  systemVersion: 'सिस्टम v2.4.1',
  poweredBy: 'द्वारा संचालित',

  // Global UI
  crisisModeActive: 'संकट मोड सक्रिय',
  demoMode: 'डेमो मोड',
  deactivateCrisis: 'संकट निष्क्रिय करें',
  fairnessOn: 'निष्पक्षता चालू',
  fairnessOff: 'निष्पक्षता बंद',
  demoBanner: 'डेमो मोड — लाइव डेटा उपलब्ध नहीं। कैश्ड स्थानीय पूर्वानुमान का उपयोग।',
  live: 'लाइव',
  back: 'वापस',
  recent: 'हाल के',
  vsLastHour: 'पिछले घंटे की तुलना में',
  available: 'उपलब्ध',
  people: 'लोग',
  units: 'इकाइयां',

  // Dashboard Stat Cards
  totalFatalities: 'कुल मृत्यु',
  housesAffected: 'प्रभावित घर',
  biasScore: 'पूर्वाग्रह स्कोर',
  reliefCamps: 'राहत शिविर',
  estimatedImpact: 'अनुमानित प्रभाव',
  mostAffected: 'सर्वाधिक प्रभावित',
  floodData: 'केरल 2018 बाढ़ डेटा',
  improved: 'सुधार',
  activeDistricts: 'सभी जिलों में सक्रिय',
  efficiency: 'दक्षता',
  dataSource: 'डेटा स्रोत: केरल 2018 बाढ़ डेटा + भारत अस्पताल निर्देशिका',

  // Audit Feed
  audit: {
    resourceReallocationTriggered: 'संसाधन पुनः आवंटन शुरू किया गया',
    biasCheckPassed: 'पक्षपात जांच पास हुई',
    priorityEscalationApproved: 'प्राथमिकता वृद्धि स्वीकृत',
    supplyDropConfirmed: 'आपूर्ति ड्रॉप की पुष्टि हुई',
    citizenRequestFulfilled: 'नागरिक अनुरोध पूरा हुआ',
    newZoneActivated: 'नया क्षेत्र सक्रिय',
    routeOptimizedByAi: 'AI द्वारा मार्ग अनुकूलित',
  },

  // Resource Types
  resourceTypes: {
    medicalUnit: 'चिकित्सा इकाई',
    searchAndRescue: 'खोज और बचाव',
    foodSupply: 'खाद्य आपूर्ति',
    waterTanker: 'पानी का टैंकर',
    engineeringTeam: 'अभियांत्रिकी दल',
    shelterKit: 'आश्रय किट',
    ambulance: 'एम्बुलेंस',
    policeSupport: 'पुलिस सहायता',
  },

  // Statuses
  status: {
    deployed: 'तैनात',
    standby: 'प्रतीक्षारत',
    transit: 'पारगमन',
    inactive: 'निष्क्रिय',
    enroute: 'मार्ग में',
  },

  // Panels
  tacticalOverview: 'सामरिक अवलोकन — केरल',
  expandTacticalView: 'सामरिक दृश्य विस्तार करें',
  fairnessSummary: 'निष्पक्षता सारांश',
  beforeAllocation: 'आवंटन से पहले',
  afterAllocation: 'आवंटन के बाद',
  biasReducedBy: 'पूर्वाग्रह कम हुआ',
  transparencyAudit: 'पारदर्शिता ऑडिट',

  // Resource Map
  resourceType: 'संसाधन प्रकार',
  severity: 'गंभीरता',
  district: 'जिला',
  resetView: 'दृश्य रीसेट करें',
  zoneStatus: 'जोन की स्थिति',
  mapLegend: 'मानचित्र किंवदंती',
  criticalSeverity: 'अत्यधिक गंभीर',
  highSeverity: 'उच्च गंभीरता',
  mediumSeverity: 'मध्यम गंभीरता',
  stableArea: 'स्थिर क्षेत्र',
  resourceRoute: 'संसाधन मार्ग',
  all: 'सभी',
  critical: 'अत्यधिक गंभीर',
  high: 'उच्च',
  medium: 'मध्यम',
  stable: 'स्थिर',
  fatalities: 'मृत्यु',
  rainfallExcess: 'अत्यधिक वर्षा',
  landslides: 'भूस्खलन',
  nearestHospital: 'निकटतम अस्पताल',
  viewDetails: 'विवरण देखें',
  loadingTacticalMap: 'सामरिक मानचित्र लोड हो रहा है...',
  requiresValidApiKey: 'वैध API कुंजी आवश्यक है',

  // Allocation Engine
  responseTime: 'प्रतिक्रिया समय',
  resourceWaste: 'संसाधन अपव्यय',
  minAvg: 'मिनट औसत',
  improvementVsBaseline: 'आधारभूत तुलना में सुधार',
  predictiveResourceLoad: 'अनुमानात्मक संसाधन लोड — अगले 6 घंटे',
  next6Hours: 'अगले 6 घंटे',
  currentLoad: 'वर्तमान लोड',
  predicted: 'अनुमानित',
  resourceAllocation: 'संसाधन आवंटन',
  active: 'सक्रिय',
  resourceId: 'संसाधन आईडी',
  type: 'प्रकार',
  assignedDistrict: 'सौंपा गया जिला',
  priorityScore: 'प्राथमिकता स्कोर',
  running: 'चल रहा है...',
  runAllocation: 'आवंटन चलाएं',
  autoOptimisationActive: 'ऑटो-ऑप्टिमाइज़ेशन सक्रिय',
  nextCycleIn: 'अगला चक्र',
  forecastPoweredByVertexAi: 'वर्टेक्स AI द्वारा पूर्वानुमान',
  vertexAiModelInfo: 'वर्टेक्स AI मॉडल v3.2.1 — 4 घंटे पहले प्रशिक्षित',
  resourcesMonitored: 'संसाधन निगरानी',

  // Fairness Analytics
  enableFairAllocation: 'निष्पक्ष आवंटन सक्षम करें',
  systemBiasScore: 'सिस्टम पूर्वाग्रह स्कोर',
  previousScore: 'पिछला',
  highBias: 'उच्च पूर्वाग्रह',
  lowBias: 'कम पूर्वाग्रह',
  withinAcceptableRange: 'स्वीकार्य सीमा के भीतर',
  actionRequired: 'कार्रवाई आवश्यक',
  fair: 'निष्पक्ष',
  biased: 'पक्षपाती',
  distributionEquity: 'वितरण इक्विटी',
  urbanBpl: 'शहरी बीपीएल',
  ruralBpl: 'ग्रामीण बीपीएल',
  combined: 'संयुक्त',
  populationDensityVsResources: 'जनसंख्या घनत्व बनाम संसाधन',
  optimalBalanceAchieved: 'इष्टतम संतुलन प्राप्त',
  infrastructureAccess: 'इन्फ्रास्ट्रक्चर एक्सेस',
  limited: 'सीमित',
  responseTimeDrift: 'प्रतिक्रिया समय विचलन',
  urban: 'शहरी',
  rural: 'ग्रामीण',
  suburban: 'उपनगरीय',
  realTimeTracking: 'रियल-टाइम ट्रैकिंग',
  aiNaturalLanguageInsights: 'AI प्राकृतिक भाषा अंतर्दष्ति',
  resourcesReallocatedToUnderservedAreas: 'कम सेवा वाले क्षेत्रों में संसाधन पुनर्आवंटित',
  biasReductionTitle: 'पूर्वाग्रह कमी — निष्पक्ष आवंटन से पहले बनाम बाद में',
  keralaBplDataInfo: 'केरल बीपीएल 2011 डेटा',
  ruralPenaltyNote: '-2.6 मिनट ग्रामीण दंड — संबोधित किया जा रहा है',
  districts6to8: 'जिलों 6-8',

  // Transparency Log
  filter: 'फ़िल्टर',
  exportToGoogleSheets: 'गूगल शीट्स में निर्यात करें',
  totalDecisions: 'कुल निर्णय',
  humanOverrides: 'मानव ओवरराइड',
  biasFlags: 'पूर्वाग्रह झंडे',
  showOverridesOnly: 'केवल ओवरराइड दिखाएं',
  showBiasFlags: 'पूर्वाग्रह झंडे दिखाएं',
  liveAuditStream: 'लाइव ऑडिट स्ट्रीम',
  timestamp: 'टाइमस्टैम्प',
  fromTo: 'से → तक',
  reason: 'कारण',
  flags: 'झंडे',
  humanOverride: 'मानव ओवरराइड',
  potentialBiasDetected: 'संभावित पूर्वाग्रह पाया गया',
  previous: 'पिछला',
  next: 'अगला',
  showing: 'दिखा रहा है',
  decisions: 'निर्णय',
  of: 'का',
  to: 'तक',
  rerouted: 'पुनर्निर्देशित',
  deployed: 'तैनात',
  reallocated: 'पुनर्आवंटित',
  override: 'ओवरराइड',

  // Citizen Requests
  selectLocation: 'स्थान चुनें',
  provideExactLocation: 'बचाव दल के लिए अपना सटीक स्थान प्रदान करें।',
  startTypingLocation: 'स्थान टाइप करना शुरू करें...',
  sendEmergencyAlert: 'आपातकालीन अलर्ट भेजें',
  cancel: 'रद्द करें',
  sendingSosAlert: 'SOS अलर्ट भेज रहा है',
  pinpointingCoordinates: 'इनके लिए निर्देशांक सटीक कर रहा है',
  yourLocation: 'आपका स्थान',
  sosReceived: 'SOS प्राप्त हुआ',
  dispatchingNearestUnit: 'गूगल मैप्स के माध्यम से आपके स्थान पर निकटतम इकाई भेज रहा है।',
  acknowledge: 'स्वीकार करें',
  sosINeedHelp: 'SOS — मुझे मदद चाहिए',
  searchRequests: 'अनुरोध खोजें...',
  voiceReportsSupported: 'वॉयस रिपोर्ट समर्थित',
  voiceReportsSubtext: 'नागरिक गूगल स्पीच-टू-टेक्स्ट के माध्यम से मलयालम, हिंदी या अंग्रेजी में ऑडियो रिपोर्ट जमा कर सकते हैं।',
  realTimeCommunityAssistance: 'रियल-टाइम सामुदायिक सहायता अनुरोध',
  assignResource: 'संसाधन सौंपें',
  viewOnMap: 'मानचित्र पर देखें',
  requestDensityMap: 'अनुरोध घनत्व मानचित्र',
  sectorHealthIndicators: 'क्षेत्र स्वास्थ्य संकेतक',

  // Settings Panel
  settings: 'सेटिंग्स',
  general: 'सामान्य',
  notifications: 'सूचनाएं',
  theme: 'थीम',
  languageRegion: 'भाषा और क्षेत्र',
  language: 'भाषा',
  account: 'खाता',
  about: 'जानकारी',
  selectLanguage: 'भाषा चुनें',
  activeLanguage: 'सक्रिय भाषा',
  resetToEnglish: 'अंग्रेज़ी में रीसेट करें',
};

const TRANSLATIONS = { en, hi };

function getT(lang, key) {
  if (typeof key !== 'string' || !key) return '';
  const parts = key.split('.');
  let current = TRANSLATIONS[lang] || TRANSLATIONS.hi || en;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && current[part]) {
      current = current[part];
    } else {
      // Fallback logic
      let fallback = en;
      for (const fPart of parts) {
        if (fallback && typeof fallback === 'object' && fallback[fPart]) {
          fallback = fallback[fPart];
        } else {
          return key;
        }
      }
      return typeof fallback === 'string' ? fallback : key;
    }
  }
  return typeof current === 'string' ? current : key;
}

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('crisisiq-lang') || 'en';
    } catch (e) {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('crisisiq-lang', language);
    } catch (e) {}
  }, [language]);

  const t = useCallback((key) => getT(language, key), [language]);
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currentLang, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
