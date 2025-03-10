export interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    dew_point_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    rain: number[];
    showers: number[];
    pressure_msl: number[];
    surface_pressure: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    evapotranspiration: number[];
    wind_speed_10m: number[];
    wind_speed_80m: number[];
    wind_speed_120m: number[];
    wind_speed_180m: number[];
    wind_direction_10m: number[];
    wind_direction_80m: number[];
    wind_direction_120m: number[];
    wind_direction_180m: number[];
    wind_gusts_10m: number[];
  };
}

export interface WeatherData {
  timestamp: Date;
  temperature: number;
  dewpoint: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  rain: number;
  showers: number;
  pressure: number;
  surfacePressure: number;
  visibility: number;
  evapotranspiration: number;
  windSpeed10m: number;
  windSpeed80m: number;
  windSpeed120m: number;
  windSpeed180m: number;
  windDirection10m: number;
  windDirection80m: number;
  windDirection120m: number;
  windDirection180m: number;
  windGusts10m: number;
  totalCloudCover: number;
  lowCloudCover: number;
  midCloudCover: number;
  highCloudCover: number;
}

export interface ForecastResult {
  forecast: string;
  metadata: {
    forecastPeriod: string;
    startDate: Date;
    endDate: Date;
    avgTemp: number;
    maxTemp: number;
    minTemp: number;
    avgWindSpeed: number;
    maxWindSpeed: number;
    dataPoints: number;
    weatherData: WeatherData[];
    dataByDate: Record<string, WeatherData[]>;
  };
}

export async function fetchWeatherForecast(lat: number, lon: number): Promise<ForecastResult> {
  // Add validation to prevent undefined values
  if (lat === undefined || lon === undefined) {
    throw new Error('Invalid coordinates: latitude and longitude must be provided');
  }
  
  console.log('Requesting forecast for coordinates:', lat, lon);

  const url = "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'dew_point_2m',
      'apparent_temperature',
      'precipitation',
      'rain',
      'showers',
      'pressure_msl',
      'surface_pressure',
      'cloud_cover',
      'cloud_cover_low',
      'cloud_cover_mid',
      'cloud_cover_high',
      'visibility',
      'evapotranspiration',
      'wind_speed_10m',
      'wind_speed_80m',
      'wind_speed_120m',
      'wind_speed_180m',
      'wind_direction_10m',
      'wind_direction_80m',
      'wind_direction_120m',
      'wind_direction_180m',
      'wind_gusts_10m'
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'America/Los_Angeles',
    forecast_model: 'hrrr'
  });

  console.log('Requesting HRRR forecast with parameters:', params.toString());
  const response = await fetch(`${url}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Weather API error: ${response.statusText} - ${errorText}`);
  }

  const data: OpenMeteoResponse = await response.json();
  console.log('API Response structure:', Object.keys(data));
  
  // Get timestamps and convert to dates
  const timestamps = data.hourly.time;
  const startDate = new Date(timestamps[0]);
  const endDate = new Date(timestamps[timestamps.length - 1]);
  console.log(`Forecast period: ${startDate.toLocaleString()} to ${endDate.toLocaleString()}`);
  console.log(`Total hourly data points: ${timestamps.length}`);
  
  // Store all weather data
  const weatherData: WeatherData[] = timestamps.map((timestamp: string, index: number) => ({
    timestamp: new Date(timestamp),
    temperature: data.hourly.temperature_2m[index],
    dewpoint: data.hourly.dew_point_2m[index],
    apparentTemperature: data.hourly.apparent_temperature[index],
    humidity: data.hourly.relative_humidity_2m[index],
    precipitation: data.hourly.precipitation[index],
    rain: data.hourly.rain[index],
    showers: data.hourly.showers[index],
    pressure: data.hourly.pressure_msl[index],
    surfacePressure: data.hourly.surface_pressure[index],
    visibility: data.hourly.visibility[index],
    evapotranspiration: data.hourly.evapotranspiration[index],
    windSpeed10m: data.hourly.wind_speed_10m[index],
    windSpeed80m: data.hourly.wind_speed_80m[index],
    windSpeed120m: data.hourly.wind_speed_120m[index],
    windSpeed180m: data.hourly.wind_speed_180m[index],
    windDirection10m: data.hourly.wind_direction_10m[index],
    windDirection80m: data.hourly.wind_direction_80m[index],
    windDirection120m: data.hourly.wind_direction_120m[index],
    windDirection180m: data.hourly.wind_direction_180m[index],
    windGusts10m: data.hourly.wind_gusts_10m[index],
    totalCloudCover: data.hourly.cloud_cover[index],
    lowCloudCover: data.hourly.cloud_cover_low[index],
    midCloudCover: data.hourly.cloud_cover_mid[index],
    highCloudCover: data.hourly.cloud_cover_high[index]
  }));
  
  // Group data by date for easier access
  const dataByDate = weatherData.reduce((acc, hour) => {
    const date = hour.timestamp.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(hour);
    return acc;
  }, {} as Record<string, WeatherData[]>);
  
  // Convert the forecast data into a readable format with hourly breakdown
  // const forecast = `Weather forecast from ${startDate.toLocaleString()} to ${endDate.toLocaleString()}:
  const forecast = `Weather forecast from ${startDate.toLocaleString()} to ${endDate.toLocaleString()}:

Daily breakdown:
${Object.entries(dataByDate).map(([date, dayData]) => {
  console.log('dataByDate::::', dataByDate);
  console.log('JUST DATE::::', date);
  const simpleDate = date;
  const dateObj = new Date(date);
  
  // Calculate daily statistics
  const dayTemps = dayData.map(h => h.temperature);
  const dayWinds = dayData.map(h => h.windSpeed10m);
  const dayClouds = dayData.map(h => h.totalCloudCover);
  
  return `
${dateObj.toLocaleDateString()} (${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}):
Summary for ${dateObj.toLocaleDateString()} (${dateObj.toLocaleDateString('en-US', { weekday: 'long' })})):
- Temperature Range: ${Math.min(...dayTemps).toFixed(1)}°F to ${Math.max(...dayTemps).toFixed(1)}°F
- Wind Range: ${Math.min(...dayWinds).toFixed(1)} mph to ${Math.max(...dayWinds).toFixed(1)} mph
- Cloud Coverage Range: ${Math.min(...dayClouds).toFixed(1)}% to ${Math.max(...dayClouds).toFixed(1)}%

Hourly Breakdown:
${dayData.map(hour => {
  // Assess flying conditions for this hour
  const windSpeed = hour.windSpeed10m;
  const windGusts = hour.windGusts10m;
  const cloudCover = hour.totalCloudCover;
  const visibility = hour.visibility;
  
  let flyingConditions = 'Suitable';
  let conditionsNote = '';
  
  if (windSpeed > 20 || windGusts > 25) {
    flyingConditions = 'Not Suitable';
    conditionsNote = 'Wind too strong';
  } else if (windSpeed < 5) {
    flyingConditions = 'Marginal';
    conditionsNote = 'Light wind conditions';
  }
  
  if (cloudCover > 80) {
    flyingConditions = 'Not Suitable';
    conditionsNote = conditionsNote ? `${conditionsNote}, Heavy cloud cover` : 'Heavy cloud cover';
  }
  
  if (visibility < 3) {
    flyingConditions = 'Not Suitable';
    conditionsNote = conditionsNote ? `${conditionsNote}, Low visibility` : 'Low visibility';
  }

  return `
${dateObj.toLocaleDateString()} (${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}) - ${hour.timestamp.toLocaleTimeString()}:
Flying Conditions: ${flyingConditions}${conditionsNote ? ` (${conditionsNote})` : ''}
- Temperature: ${hour.temperature.toFixed(1)}°F
- Apparent Temperature: ${hour.apparentTemperature.toFixed(1)}°F
- Dewpoint: ${hour.dewpoint.toFixed(1)}°F
- Relative Humidity: ${hour.humidity.toFixed(1)}%
- Precipitation: ${hour.precipitation.toFixed(3)} inches
- Wind: ${hour.windSpeed10m.toFixed(1)} mph at ${hour.windDirection10m.toFixed(0)}° (Gusts: ${hour.windGusts10m.toFixed(1)} mph)
- Cloud Coverage: ${hour.totalCloudCover.toFixed(1)}%
  - Low: ${hour.lowCloudCover.toFixed(1)}%
  - Mid: ${hour.midCloudCover.toFixed(1)}%
  - High: ${hour.highCloudCover.toFixed(1)}%
- Visibility: ${hour.visibility.toFixed(1)} miles
- Pressure: ${hour.pressure.toFixed(1)} hPa`;
}).join('\n')}`;
}).join('\n')}

Overall Summary Statistics:
- Average Temperature: ${(weatherData.reduce((sum, d) => sum + d.temperature, 0) / weatherData.length).toFixed(1)}°F
- Max Temperature: ${Math.max(...weatherData.map(d => d.temperature)).toFixed(1)}°F
- Min Temperature: ${Math.min(...weatherData.map(d => d.temperature)).toFixed(1)}°F
- Average Wind Speed: ${(weatherData.reduce((sum, d) => sum + d.windSpeed10m, 0) / weatherData.length).toFixed(1)} mph
- Max Wind Speed: ${Math.max(...weatherData.map(d => d.windSpeed10m)).toFixed(1)} mph
- Average Cloud Coverage: ${(weatherData.reduce((sum, d) => sum + d.totalCloudCover, 0) / weatherData.length).toFixed(1)}%`;

  // Calculate statistics
  const temperatures = weatherData.map(d => d.temperature);
  const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
  const maxTemp = Math.max(...temperatures);
  const minTemp = Math.min(...temperatures);

  const windSpeeds = weatherData.map(d => d.windSpeed10m);
  const avgWindSpeed = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
  const maxWindSpeed = Math.max(...windSpeeds);
  
  return {
    forecast,
    metadata: {
      forecastPeriod: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      startDate,
      endDate,
      avgTemp,
      maxTemp,
      minTemp,
      avgWindSpeed,
      maxWindSpeed,
      dataPoints: timestamps.length,
      weatherData,
      dataByDate
    }
  };
} 