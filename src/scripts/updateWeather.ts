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