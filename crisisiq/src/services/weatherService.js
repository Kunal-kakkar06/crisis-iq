const WEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY || 'Raaqhf49zvs3uS0sO0cOwAn6zfgqtrgE';

// Cache weather data in sessionStorage for 10 minutes
const CACHE_KEY = 'crisisiq_weather_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedWeather(lat, lng) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    const key = `${lat},${lng}`;
    if (cache[key] && (Date.now() - cache[key].timestamp) < CACHE_TTL) {
      return cache[key].data;
    }
  } catch (e) { /* ignore */ }
  return null;
}

function setCachedWeather(lat, lng, data) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    cache[`${lat},${lng}`] = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) { /* ignore */ }
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches real-time weather data from Tomorrow.io API
 * With caching + rate-limit awareness
 */
export async function getWeatherForCity(lat, lng) {
  // Check cache first
  const cached = getCachedWeather(lat, lng);
  if (cached) return cached;

  // Tomorrow.io Realtime API
  const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${WEATHER_KEY}`;
  
  const response = await fetch(url);
  
  if (response.status === 429) {
    throw new Error('Rate limit exceeded');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch weather from Tomorrow.io');
  }

  // Tomorrow.io response structure: data.values
  const values = data.data.values;
  
  const result = {
    temp: values.temperature,
    rainfall: values.rainIntensity || 0,
    humidity: values.humidity,
    description: getWeatherDescription(values.weatherCode),
    windSpeed: values.windSpeed,
    icon: '01d'
  };

  // Cache the result
  setCachedWeather(lat, lng, result);
  return result;
}

/**
 * Fetch weather for multiple zones with staggered delays
 * to avoid hitting Tomorrow.io rate limits (3 req/sec free tier)
 */
export async function getWeatherForAllZones(zones) {
  const results = [];
  
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    try {
      const weather = await getWeatherForCity(zone.lat, zone.lng);
      results.push({ ...zone, weather });
    } catch (err) {
      results.push({ ...zone, weather: null, error: true });
    }
    
    // Wait 400ms between calls to stay under 3 req/sec limit
    if (i < zones.length - 1) {
      await delay(400);
    }
  }
  
  return results;
}

// Helper to map Tomorrow.io weather codes to descriptions
function getWeatherDescription(code) {
  const codes = {
    1000: 'Clear',
    1100: 'Mostly Clear',
    1101: 'Partly Cloudy',
    1102: 'Mostly Cloudy',
    1001: 'Cloudy',
    2000: 'Fog',
    2100: 'Light Fog',
    4000: 'Drizzle',
    4001: 'Rain',
    4200: 'Light Rain',
    4201: 'Heavy Rain',
    5000: 'Snow',
    5001: 'Flurries',
    5100: 'Light Snow',
    5101: 'Heavy Snow',
    6000: 'Freezing Drizzle',
    6001: 'Freezing Rain',
    6200: 'Light Freezing Rain',
    6201: 'Heavy Freezing Rain',
    7000: 'Ice Pellets',
    7101: 'Heavy Ice Pellets',
    7102: 'Light Ice Pellets',
    8000: 'Thunderstorm'
  };
  return codes[code] || 'Clear';
}

export async function getWeatherAlerts(lat, lng) {
  return [];
}
