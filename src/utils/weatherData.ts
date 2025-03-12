import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { fetchWeatherForecast } from './openMeteo';
import { Location } from '../types';

const BATCH_SIZE = 20; // Process documents in smaller batches

// Helper function to format date as YYYY-MM-DD in PST
function formatDatePST(date: Date): string {
  // Get date components in PST
  const pstDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');
  
  // Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
}

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

// Helper function to create a document for a specific date
function createDailyDocument(location: Location, 
                            date: string, 
                            dayData: any[], 
                            forecastTimestamp: string) {
  // Convert to PST and format dates
  const dateObj = new Date(date);
  const pstDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const formattedDate = formatDatePST(pstDate);
  const dayOfWeek = pstDate.toLocaleDateString('en-US', { 
    timeZone: 'America/Los_Angeles',
    weekday: 'long' 
  });
  
  // Calculate daily statistics
  const dayTemps = dayData.map(h => h.temperature);
  const dayWinds = dayData.map(h => h.windSpeed10m);
  const dayClouds = dayData.map(h => h.totalCloudCover);
  
  // Create the daily forecast content
  const dailyForecast = `
Weather forecast for ${location.name} on ${formattedDate} (${dayOfWeek}):

Daily Summary:
- Temperature Range: ${Math.min(...dayTemps).toFixed(1)}°F to ${Math.max(...dayTemps).toFixed(1)}°F
- Wind Range: ${Math.min(...dayWinds).toFixed(1)} mph to ${Math.max(...dayWinds).toFixed(1)} mph
- Cloud Coverage Range: ${Math.min(...dayClouds).toFixed(1)}% to ${Math.max(...dayClouds).toFixed(1)}%

Hourly Breakdown:
${dayData.map(hour => {
  // Convert hour timestamp to PST
  const hourPST = new Date(hour.timestamp).toLocaleString('en-US', { 
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

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

  const hourTime = new Date(hour.timestamp).toLocaleTimeString();
  
  return `
${formattedDate} ${hourPST}:
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
}).join('\n')}
  `.trim();

  // Create hourly data in a format suitable for Pinecone metadata
  const hourlyData = dayData.map(hour => ({
    timestamp: new Date(hour.timestamp).toISOString(),
    temperature: hour.temperature.toFixed(1),
    windSpeed: hour.windSpeed10m.toFixed(1),
    windDirection: hour.windDirection10m.toFixed(0),
    cloudCover: hour.totalCloudCover.toFixed(1),
    visibility: hour.visibility.toFixed(1),
    pressure: hour.pressure.toFixed(1)
  }));

  // Create the document with metadata
  return new Document({
    pageContent: dailyForecast,
    metadata: {
      source: 'open-meteo.com',
      type: 'weather_forecast',
      location: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      forecastDate: formattedDate, // Using YYYY-MM-DD format in PST
      dayOfWeek: dayOfWeek,
      averageTemp: (dayTemps.reduce((a, b) => a + b, 0) / dayTemps.length).toFixed(1),
      maxTemp: Math.max(...dayTemps).toFixed(1),
      minTemp: Math.min(...dayTemps).toFixed(1),
      averageWindSpeed: (dayWinds.reduce((a, b) => a + b, 0) / dayWinds.length).toFixed(1),
      maxWindSpeed: Math.max(...dayWinds).toFixed(1),
      averageCloudCover: (dayClouds.reduce((a, b) => a + b, 0) / dayClouds.length).toFixed(1),
      dataPoints: dayData.length.toString(),
      hourlyData: hourlyData
    },
  });
}

export async function updateWeatherData(locations: Location[]) {
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
      console.log(`Coordinates: ${location.latitude}, ${location.longitude}`);
      
      // Fetch the forecast data with proper coordinates
      const forecast = await fetchWeatherForecast(location.latitude, location.longitude);
      
      // Get the forecast timestamp (when the forecast was generated)
      const forecastTimestamp = forecast.metadata.startDate.toISOString();
      console.log(`Forecast generated at: ${forecastTimestamp}`);
      
      // Create one document per day
      console.log('Creating daily documents...');
      const dailyDocs: Document[] = [];
      
      // Process each day in dataByDate
      for (const [date, dayData] of Object.entries(forecast.metadata.dataByDate)) {
        console.log(`Creating document for date (PST): ${formatDatePST(new Date(date))}`);
        
        // Create a document for this specific day
        const dailyDoc = createDailyDocument(
          location, 
          date,
          dayData,
          forecastTimestamp
        );
        
        dailyDocs.push(dailyDoc);
      }
      
      console.log(`Created ${dailyDocs.length} daily documents`);

      // Process each daily document
      let totalChunks = 0;
      for (let dayIndex = 0; dayIndex < dailyDocs.length; dayIndex++) {
        const dailyDoc = dailyDocs[dayIndex];
        const forecastDate = dailyDoc.metadata.forecastDate as string;
        
        console.log(`Processing document for ${forecastDate}...`);
        
        // Split the document if needed
        const textSplitter = new CharacterTextSplitter({
          chunkSize: 4000,
          chunkOverlap: 400,
        });

        const splitDocs = await textSplitter.splitDocuments([dailyDoc]);
        console.log(`Created ${splitDocs.length} chunks for ${forecastDate}`);
        totalChunks += splitDocs.length;

        // Process chunks in batches
        for (let i = 0; i < splitDocs.length; i += BATCH_SIZE) {
          const batch = splitDocs.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(splitDocs.length / BATCH_SIZE)} for ${forecastDate}...`);
          
          try {
            // Generate embeddings for the batch
            const batchEmbeddings = await Promise.all(
              batch.map(doc => embeddings.embedQuery(doc.pageContent))
            );

            // Prepare vectors for Pinecone
            const vectors = batch.map((doc, idx) => {
              // Clean the metadata to ensure it's compatible with Pinecone
              const cleanedMetadata = cleanMetadata({
                ...doc.metadata,
                text: doc.pageContent.substring(0, 1000), // Limit text size
                chunkIndex: idx.toString(),
                totalChunks: splitDocs.length.toString()
              });
              
              return {
                // Create a unique ID that includes location, date, and chunk index
                id: `${location.name}-${forecastDate}-${i + idx}`,
                values: batchEmbeddings[idx],
                metadata: cleanedMetadata
              };
            });

            // Upsert vectors to Pinecone
            await pineconeIndex.upsert(vectors);
            console.log(`✓ Successfully added batch ${Math.floor(i / BATCH_SIZE) + 1} for ${forecastDate}`);
          } catch (error) {
            console.error(`Error adding batch for ${forecastDate}:`, error);
            throw error;
          }
        }
        
        console.log(`✓ Weather data for ${forecastDate} successfully added to Pinecone for ${location.name}`);
      }
      
      console.log(`✓ All weather data (${totalChunks} chunks across ${dailyDocs.length} days) successfully added to Pinecone for ${location.name}`);
    }

    console.log('\n✓ Weather data update completed successfully for all locations');
  } catch (error) {
    console.error('Error updating weather data:', error);
    throw error;
  }
} 