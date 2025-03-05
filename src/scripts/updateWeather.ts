import { ReadableStream } from 'node:stream/web';
import { config } from 'dotenv';
import { updateWeatherData } from '../utils/weatherData';

// Force reload environment variables
config({ path: '.env.local', override: true });

// Make ReadableStream available globally
if (!globalThis.ReadableStream) {
  (globalThis as any).ReadableStream = ReadableStream;
}

// Define locations for weather forecasts
const locations = [
  {
    lat: 37.7652,
    lon: -122.2416,
    name: 'Alameda'
  },
  {
    lat: 37.7652,
    lon: -122.2416,
    name: 'Alameda'
  },
  {
    lat: 37.6684,
    lon: 122.4942,
    name: 'Mussel Rock State Park'
  },
  {
    lat: 38.1379,
    lon: -122.195,
    name: 'Blue Rock'
  },
  {
    lat: 37.4472,
    lon: 121.8478,
    name: 'Ed Levin County Park'
  },
  
  // Add more locations as needed
];

async function main() {
  try {
    await updateWeatherData(locations);
  } catch (error) {
    console.error('Failed to update weather data:', error);
    process.exit(1);
  }
}

main(); 