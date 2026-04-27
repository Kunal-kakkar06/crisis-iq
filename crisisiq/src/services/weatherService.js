const WEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY || 'Raaqhf49zvs3uS0sO0cOwAn6zfgqtrgE';

export async function getWeatherForCity(lat, lng) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_KEY}&units=metric`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.cod !== 200) {
    throw new Error(data.message || 'Failed to fetch weather');
  }

  return {
    temp: data.main?.temp,
    rainfall: data.rain?.['1h'] || 0,
    humidity: data.main?.humidity,
    description: data.weather?.[0]?.description,
    windSpeed: data.wind?.speed,
    icon: data.weather?.[0]?.icon
  };
}

export async function getWeatherAlerts(lat, lng) {
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&appid=${WEATHER_KEY}&units=metric&exclude=minutely,hourly`;
  
  const response = await fetch(url);
  const data = await response.json();
  return data.alerts || [];
}
