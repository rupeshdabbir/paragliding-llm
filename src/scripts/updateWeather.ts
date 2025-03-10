/**
 * Weather Update Script
 * 
 * This script fetches weather data from Open-Meteo API and stores it in Pinecone.
 * 
 * Before running this script, make sure you have a .env file with the following variables:
 * - PINECONE_API_KEY: Your Pinecone API key
 * - PINECONE_INDEX: Your Pinecone index name
 * - GOOGLE_API_KEY: Your Google AI API key
 * 
 * You can copy .env.example to .env and fill in your values.
 */

import { config } from 'dotenv';
import path from 'path';
import { updateWeatherData } from '../utils/weatherData';
import { Location } from '../types';

// Load environment variables from .env.local file
config({ path: path.resolve(process.cwd(), '.env.local') });

// Verify environment variables are loaded
function checkEnvironmentVariables() {
  const requiredVars = ['PINECONE_API_KEY', 'PINECONE_INDEX', 'GOOGLE_API_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env.local file or environment settings.');
    process.exit(1);
  }
  
  console.log('Environment variables loaded successfully from .env.local');
}

async function main() {
  try {
    // Check environment variables before proceeding
    checkEnvironmentVariables();
    
    // Define locations with proper structure
    const locations: Location[] = [
      {
        name: "Alameda",
        latitude: 37.7652,
        longitude: -122.2416
      },
      {
        name: "Mussel Rock State Park",
        latitude: 37.6684,
        longitude: -122.4944
      },
      {
        name: "Blue Rock",
        latitude: 38.1379,
        longitude: -122.1950
      },
      {
        name: "Ed Levin County Park",
        latitude: 37.4666,
        longitude: -121.8569
      }
    ];

    // Update weather data for all locations
    await updateWeatherData(locations);
  } catch (error) {
    console.error('Failed to update weather data:', error);
    process.exit(1);
  }
}

main(); 