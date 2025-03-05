import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';

// Windy API configuration
const WINDY_API_KEY = 'yctyXpeQXeRxVLpUGSkUCfTjbVNR80Qk';
if (!WINDY_API_KEY) {
  throw new Error('WINDY_API_KEY environment variable is not set');
}

const WINDY_API_URL = 'https://api.windy.com/api/point-forecast/v2';

interface ForecastResult {
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
  };
}

async function fetchWindyForecast(lat: number, lon: number): Promise<ForecastResult> {
  // Get current date and date 7 days from now
  const now = new Date();
  now.setHours(0, 0, 0, 0);  // Start from beginning of today
  const oneWeekFromNow = new Date(now);
  oneWeekFromNow.setDate(now.getDate() + 7);

  console.log('Requesting forecast from:', now.toLocaleString(), 'to:', oneWeekFromNow.toLocaleString());

  const response = await fetch(WINDY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lat,
      lon,
      model: 'gfs',
      parameters: [
        'temp', 
        'wind', 
        'dewpoint', 
        'precip', 
        'pressure',
        'lclouds',    // Low clouds (above 800hPa)
        'mclouds',    // Medium clouds (between 450hPa and 800hPa)
        'hclouds'     // High clouds (below 450hPa)
      ],
      key: WINDY_API_KEY,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Windy API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('API Response structure:', Object.keys(data));
  console.log('Available parameters:', data.units ? Object.keys(data.units) : 'No units found');
  
  // Convert timestamps from milliseconds to seconds if needed
  if (data.ts && data.ts[0] > 1e12) {
    data.ts = data.ts.map((ts: number) => Math.floor(ts / 1000));
  }
  
  // Log a summary of the data instead of the full response
  console.log(`Received forecast data: ${data.ts?.length || 0} timestamps`);
  const startDate = new Date(data.ts?.[0] * 1000);
  const endDate = new Date(data.ts?.[data.ts.length - 1] * 1000);
  console.log(`Forecast period: ${startDate.toLocaleString()} to ${endDate.toLocaleString()}`);
  
  // Format the forecast period for metadata
  const forecastPeriod = `${startDate.toISOString()} to ${endDate.toISOString()}`;
  
  // Convert the forecast data into a readable format
  const forecast = data.ts.map((timestamp: number, index: number) => {
    const date = new Date(timestamp * 1000);
    
    // Calculate wind speed and direction from u and v components
    const windU = data['wind_u-surface']?.[index] ?? 0;
    const windV = data['wind_v-surface']?.[index] ?? 0;
    const windSpeed = (Math.sqrt(Math.pow(windU, 2) + Math.pow(windV, 2)) * 2.237).toFixed(1);  // Convert to mph
    const windDirection = ((Math.atan2(windV, windU) * 180 / Math.PI + 180) % 360).toFixed(0);
    
    // Get cloud coverage percentages
    const lowClouds = data['lclouds-surface']?.[index] ?? 0;
    const midClouds = data['mclouds-surface']?.[index] ?? 0;
    const highClouds = data['hclouds-surface']?.[index] ?? 0;

    // Convert temperature from Kelvin to Fahrenheit
    const tempF = ((data['temp-surface']?.[index] - 273.15) * 9/5 + 32).toFixed(1);
    
    return `
      Date: ${date.toLocaleDateString()}
      Time: ${date.toLocaleTimeString()}
      Temperature: ${tempF}°F
      Wind Speed: ${windSpeed} mph
      Wind Direction: ${windDirection}°
      Cloud Coverage:
        - Low Clouds: ${(lowClouds * 100).toFixed(0)}%
        - Mid Clouds: ${(midClouds * 100).toFixed(0)}%
        - High Clouds: ${(highClouds * 100).toFixed(0)}%
      Dewpoint: ${((data['dewpoint-surface']?.[index] - 273.15) * 9/5 + 32).toFixed(1)}°F
      Pressure: ${(data['pressure-surface']?.[index] / 100).toFixed(1)} hPa
      Precipitation: ${(data['precip-surface']?.[index] * 1000).toFixed(1)} mm
    `.trim();
  }).join('\n\n');

  // Calculate statistics in Fahrenheit
  const temperatures = data['temp-surface'].map((t: number) => (t - 273.15) * 9/5 + 32);
  const avgTemp = temperatures.reduce((a: number, b: number) => a + b, 0) / temperatures.length;
  const maxTemp = Math.max(...temperatures);
  const minTemp = Math.min(...temperatures);

  const windSpeeds = data['wind_u-surface'].map((u: number, i: number) => {
    const v = data['wind_v-surface'][i];
    return Math.sqrt(Math.pow(u, 2) + Math.pow(v, 2)) * 2.237;  // Convert from m/s to mph
  });
  const avgWindSpeed = windSpeeds.reduce((a: number, b: number) => a + b, 0) / windSpeeds.length;
  const maxWindSpeed = Math.max(...windSpeeds);
  
  return {
    forecast,
    metadata: {
      forecastPeriod,
      startDate,
      endDate,
      avgTemp,
      maxTemp,
      minTemp,
      avgWindSpeed,
      maxWindSpeed,
      dataPoints: data.ts.length
    }
  };
}

export async function updateWeatherData(locations: { lat: number; lon: number; name: string }[]) {
  try {
    console.log('Initializing Pinecone...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    console.log('Initializing embeddings with Google AI...');
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY!,
      modelName: 'models/embedding-001'  // Using the standard embedding model
    });

    // Test the embeddings model
    console.log('Testing embeddings generation...');
    const testEmbedding = await embeddings.embedQuery('test query');
    console.log('Test embedding dimension:', testEmbedding.length);

    const indexName = process.env.PINECONE_INDEX!;
    if (!indexName) {
      throw new Error('PINECONE_INDEX environment variable is not set');
    }
    console.log(`Getting Pinecone index: ${indexName}`);
    const pineconeIndex = pinecone.Index(indexName);

    console.log('Checking index stats...');
    const stats = await pineconeIndex.describeIndexStats();
    console.log('Current index stats:', stats);

    if (stats.dimension !== testEmbedding.length) {
      throw new Error(`Pinecone index dimension (${stats.dimension}) does not match embedding dimension (${testEmbedding.length}). Please recreate the index with the correct dimension.`);
    }

    console.log('Creating vector store from existing index...');
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });

    // Fetch and process weather data for each location
    for (const location of locations) {
      console.log(`\nProcessing location: ${location.name}`);
      console.log(`Fetching weather data for ${location.name}...`);
      const { forecast, metadata } = await fetchWindyForecast(location.lat, location.lon);

      console.log('Creating document with forecast data...');
      const doc = new Document({
        pageContent: `Weather forecast for ${location.name}:\n${forecast}`,
        metadata: {
          source: 'windy.com',
          type: 'weather_forecast',
          location: location.name,
          latitude: location.lat,
          longitude: location.lon,
          timestamp: new Date().toISOString(),
          forecastPeriod: metadata.forecastPeriod,
          forecastStartDate: metadata.startDate.toISOString(),
          forecastEndDate: metadata.endDate.toISOString(),
          weatherStats: {
            averageTemp: metadata.avgTemp.toFixed(1),
            maxTemp: metadata.maxTemp.toFixed(1),
            minTemp: metadata.minTemp.toFixed(1),
            averageWindSpeed: metadata.avgWindSpeed.toFixed(1),
            maxWindSpeed: metadata.maxWindSpeed.toFixed(1),
            dataPoints: metadata.dataPoints
          }
        },
      });

      console.log('Splitting document into chunks...');
      const textSplitter = new CharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await textSplitter.splitDocuments([doc]);
      console.log(`Created ${splitDocs.length} chunks`);

      // Verify embeddings before adding to Pinecone
      console.log('Generating embeddings for chunks...');
      const embeddingVectors = await Promise.all(
        splitDocs.map(doc => embeddings.embedQuery(doc.pageContent))
      );
      console.log('Generated embeddings dimensions:', embeddingVectors.map(v => v.length));

      console.log('Adding documents to Pinecone...');
      await vectorStore.addDocuments(splitDocs);
      console.log(`✓ Weather data successfully added to Pinecone for ${location.name}`);
    }

    console.log('\n✓ Weather data update completed successfully for all locations');
  } catch (error) {
    console.error('Error updating weather data:', error);
    throw error;
  }
} 