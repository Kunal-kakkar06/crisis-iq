const WEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY || 'Raaqhf49zvs3uS0sO0cOwAn6zfgqtrgE';

/**
 * Fetches real-time weather data from Tomorrow.io API
 */
export async function getWeatherForCity(lat, lng) {
  // Tomorrow.io Realtime API
  const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${WEATHER_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch weather from Tomorrow.io');
  }

  // Tomorrow.io response structure: data.values
  const values = data.data.values;
  
  return {
    temp: values.temperature,
    rainfall: values.rainIntensity || 0,
    humidity: values.humidity,
    description: getWeatherDescription(values.weatherCode),
    windSpeed: values.windSpeed,
    icon: '01d' // Default icon, Tomorrow.io uses codes
  };
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
  // Tomorrow.io doesn't have a simple free alerts endpoint like onecall, 
  // but we can simulate based on intensity
  return [];
}
