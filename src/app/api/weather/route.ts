import { NextRequest, NextResponse } from 'next/server';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export async function POST(req: NextRequest) {
  try {
    const { lat, lon } = await req.json();

    // Construct the URL with all required parameters
    const url = new URL(OPEN_METEO_URL);
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('hourly', [
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
    ].join(','));
    url.searchParams.append('timezone', 'America/Los_Angeles');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in weather route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
} 