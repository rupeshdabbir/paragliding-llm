import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Pinecone
const initPinecone = async () => {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  return pinecone;
};

function calculateFlightConditions(weatherData: any) {
  // Extract relevant weather parameters
  const windSpeed = weatherData['wind_u-surface'] && weatherData['wind_v-surface'] 
    ? Math.sqrt(Math.pow(weatherData['wind_u-surface'][0], 2) + Math.pow(weatherData['wind_v-surface'][0], 2)) * 2.237
    : 0;
  
  const lowClouds = (weatherData['lclouds-surface']?.[0] ?? 0) * 100;
  const midClouds = (weatherData['mclouds-surface']?.[0] ?? 0) * 100;
  const highClouds = (weatherData['hclouds-surface']?.[0] ?? 0) * 100;
  
  // Calculate flight conditions score (0-100)
  let score = 100;
  
  // Wind speed factors (ideal: 5-15 mph)
  if (windSpeed < 5) score -= 20;
  else if (windSpeed > 20) score -= 40;
  else if (windSpeed > 15) score -= 20;
  
  // Cloud coverage factors
  const totalCloudCoverage = (lowClouds + midClouds + highClouds) / 3;
  if (totalCloudCoverage > 80) score -= 30;
  else if (totalCloudCoverage > 60) score -= 20;
  
  // Determine recommendation based on score
  let recommendation: 'Low' | 'Medium' | 'High';
  if (score >= 80) recommendation = 'High';
  else if (score >= 50) recommendation = 'Medium';
  else recommendation = 'Low';
  
  return {
    recommendation,
    confidence: score,
    windSpeed,
    windDirection: ((Math.atan2(
      weatherData['wind_v-surface']?.[0] ?? 0,
      weatherData['wind_u-surface']?.[0] ?? 0
    ) * 180 / Math.PI + 180) % 360)
  };
}

export async function POST(req: NextRequest) {
  try {
    const { message, location } = await req.json();

    // Format location string if available
    let locationStr = 'Location unknown';
    if (location) {
      locationStr = location.city && location.country
        ? `${location.city}, ${location.country}`
        : `Latitude: ${location.latitude}, Longitude: ${location.longitude}`;
    }

    // Initialize Gemini model and embeddings
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
      modelName: 'models/gemini-1.5-pro-002',
      maxOutputTokens: 2048,
    });

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY!,
      modelName: 'models/embedding-001',
    });

    // Initialize Pinecone
    const pinecone = await initPinecone();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);

    // Create vector store
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex }
    );

    // Perform similarity search
    const similarDocs = await vectorStore.similaritySearch(message, 3);

    // Get the most recent weather data from the similar documents
    const weatherData = similarDocs[0]?.metadata?.weatherData;
    const flightConditions = weatherData ? calculateFlightConditions(weatherData) : null;

    // Generate response using context and user message
    const context = similarDocs.map((doc: any) => doc.pageContent).join('\n');
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const response = await model.call([
      { 
        role: 'system', 
        content: `Today is ${today}. User's location: ${locationStr}.

You are a helpful AI assistant that provides weather and paragliding information. You MUST include weather data in EVERY response using this markdown format:

## Current Weather Conditions
${flightConditions ? `
- Wind Speed: ${flightConditions.windSpeed.toFixed(1)} mph
- Wind Direction: ${flightConditions.windDirection.toFixed(0)}° (${getCardinalDirection(flightConditions.windDirection)})
- Flight Recommendation: ${flightConditions.recommendation}
- Confidence Score: ${flightConditions.confidence.toFixed(0)}%` : ''}

## Flight Assessment
${flightConditions ? `
Based on current conditions:
- **Flight Safety Level**: ${flightConditions.recommendation}
- **Confidence**: ${flightConditions.confidence.toFixed(0)}%
- **Wind Conditions**: ${flightConditions.windSpeed.toFixed(1)} mph at ${flightConditions.windDirection.toFixed(0)}°` : ''}

**Important:** Always emphasize safety and the need to consult local experts.

Use the following context to help answer the question: ${context}`
      },
      { role: 'user', content: message }
    ]);

    // Add helper function for wind direction
    function getCardinalDirection(degrees: number): string {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const index = Math.round(((degrees % 360) / 45)) % 8;
      return directions[index];
    }

    // Convert response content to string and ensure weather data is included
    let responseText = '';
    if (typeof response.content === 'string') {
      responseText = response.content;
    } else if (Array.isArray(response.content)) {
      responseText = response.content
        .map(item => typeof item === 'string' ? item : JSON.stringify(item))
        .join('\n');
    }

    // Format the response with proper line breaks
    const formattedResponse = responseText
      .replace(/\n\n/g, '\n\n')  // Ensure consistent line breaks
      .trim();

    // Always include weather data in the response
    return NextResponse.json({
      response: formattedResponse,
      weatherData: flightConditions ? {
        windSpeed: flightConditions.windSpeed,
        windDirection: flightConditions.windDirection,
        flightConditions: {
          recommendation: flightConditions.recommendation,
          confidence: flightConditions.confidence
        }
      } : null
    });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 