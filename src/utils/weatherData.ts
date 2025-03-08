import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { fetchWeatherForecast, WeatherData } from './openMeteo';
import { Location } from '../types';

const BATCH_SIZE = 20; // Process documents in smaller batches

// Helper function to clean metadata
function cleanMetadata(metadata: any) {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value.toString();
    }
  }
  return clean;
}

// When preparing metadata for Pinecone
function prepareMetadata(weatherData: any, location: Location) {
  // Convert timestamps to Date objects and format them
  const weatherDataWithDates = weatherData.hourly.time.map((timestamp: string, index: number) => ({
    timestamp: new Date(timestamp),
    windSpeed10m: weatherData.hourly.wind_speed_10m[index],
    windDirection10m: weatherData.hourly.wind_direction_10m[index],
    totalCloudCover: weatherData.hourly.cloud_cover[index],
    visibility: weatherData.hourly.visibility[index],
    // ... other weather parameters ...
  }));

  // Get the date range for the forecast period
  const startDate = new Date(weatherData.hourly.time[0]);
  const endDate = new Date(weatherData.hourly.time[weatherData.hourly.time.length - 1]);
  
  // Format as a single period string
  const forecastPeriod = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;

  // Only include the fields we want to store in Pinecone
  const metadata = {
    location: {
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    },
    forecastPeriod,
    weatherData: weatherDataWithDates,
  };

  // Return clean metadata without any additional fields
  return metadata;
}

async function addWeatherDataToPinecone(weatherData: any, location: Location, pineconeIndex: any) {
  try {
    // Prepare metadata
    const metadata = prepareMetadata(weatherData, location);
    
    // Create document text
    const documentText = createDocumentText(metadata);
    
    // Generate embedding
    const embedding = await generateEmbedding(documentText);
    
    // Prepare vector for Pinecone
    const vector = {
      id: `${location.name}-${Date.now()}`,
      values: embedding,
      metadata: metadata // This will only include the fields we specified above
    };

    // Upsert to Pinecone
    await pineconeIndex.upsert([vector]);
    
    console.log(`✓ Weather data successfully added to Pinecone for ${location.name}`);
  } catch (error) {
    console.error(`Error adding weather data to Pinecone for ${location.name}:`, error);
    throw error;
  }
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

    // Fetch and process weather data for each location
    for (const location of locations) {
      console.log(`\nProcessing location: ${location.name}`);
      console.log(`Fetching weather data for ${location.name}...`);
      const { forecast, metadata } = await fetchWeatherForecast(location.lat, location.lon);
      // console.log('Forecast:', forecast);
      // console.log('Metadata:', metadata);

      console.log('Creating document with forecast data...');
      const doc = new Document({
        pageContent: `Weather forecast for ${location.name}:\n${forecast}`,
        metadata: {
          source: 'open-meteo.com',
          type: 'weather_forecast',
          location: location.name,
          latitude: location.lat.toString(),
          longitude: location.lon.toString(),
          timestamp: new Date().toISOString(),
          forecastPeriod: metadata.forecastPeriod,
          // forecastStartDate: metadata.startDate.toISOString(),
          // forecastEndDate: metadata.endDate.toISOString(),
          averageTemp: metadata.avgTemp.toFixed(1),
          maxTemp: metadata.maxTemp.toFixed(1),
          minTemp: metadata.minTemp.toFixed(1),
          averageWindSpeed: metadata.avgWindSpeed.toFixed(1),
          maxWindSpeed: metadata.maxWindSpeed.toFixed(1),
          dataPoints: metadata.dataPoints.toString(),
          hourlyData: metadata.weatherData.map(hour => ({
            timestamp: hour.timestamp.toISOString(),
            temperature: hour.temperature.toFixed(1),
            windSpeed: hour.windSpeed10m.toFixed(1),
            windDirection: hour.windDirection10m.toFixed(0),
            cloudCover: hour.totalCloudCover.toFixed(1),
            visibility: hour.visibility.toFixed(1),
            pressure: hour.pressure.toFixed(1)
          }))
        },
      });

      console.log('Splitting document into chunks...');
      const textSplitter = new CharacterTextSplitter({
        chunkSize: 4000,  // Increased chunk size to keep more data together
        chunkOverlap: 400,  // Increased overlap to ensure continuity
      });

      const splitDocs = await textSplitter.splitDocuments([doc]);
      console.log(`Created ${splitDocs.length} chunks`);

      // Process chunks in batches
      console.log(`Adding documents to Pinecone in batches of ${BATCH_SIZE}...`);
      for (let i = 0; i < splitDocs.length; i += BATCH_SIZE) {
        const batch = splitDocs.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(splitDocs.length / BATCH_SIZE)}...`);
        
        try {
          // Generate embeddings for the batch
          const batchEmbeddings = await Promise.all(
            batch.map(doc => embeddings.embedQuery(doc.pageContent))
          );

          // Prepare vectors for Pinecone
          const vectors = batch.map((doc, idx) => ({
            id: `${location.name}-${i + idx}`,
            values: batchEmbeddings[idx],
            metadata: cleanMetadata({
              ...doc.metadata,
              text: doc.pageContent,
              chunkIndex: idx.toString(),
              totalChunks: splitDocs.length.toString()
            })
          }));

          // Upsert vectors to Pinecone
          await pineconeIndex.upsert(vectors);
          console.log(`✓ Successfully added batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        } catch (error) {
          console.error(`Error adding batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
          throw error;
        }
      }
      
      console.log(`✓ Weather data successfully added to Pinecone for ${location.name}`);
    }

    console.log('\n✓ Weather data update completed successfully for all locations');
  } catch (error) {
    console.error('Error updating weather data:', error);
    throw error;
  }
} 