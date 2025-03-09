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

// Helper function to format date as MM/DD/YYYY only
function formatSimpleDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}


function parseDateFromQuery(message: string): string | null {
  // Create dates
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  
  // Convert message to lowercase for easier matching
  const lowerMessage = message.toLowerCase();
  
  // Handle relative dates
  if (lowerMessage.includes('tomorrow')) {
    const dateStr = formatSimpleDate(tomorrow);
    console.log('Target date:', dateStr);
    return dateStr;
  }
  
  if (lowerMessage.includes('this weekend')) {
    const saturday = new Date();
    saturday.setDate(today.getDate() + (6 - today.getDay())); // Get next Saturday
    return formatSimpleDate(saturday);
  }
  
  // Handle specific days of the week
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (const day of daysOfWeek) {
    if (lowerMessage.includes(day)) {
      const targetDayIndex = daysOfWeek.indexOf(day);
      const currentDayIndex = today.getDay();
      const daysUntilTarget = (targetDayIndex - currentDayIndex + 7) % 7;
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + daysUntilTarget);
      return formatSimpleDate(targetDate);
    }
  }
  
  return null;
}

function calculateFlightConditions(weatherData: any, queryDateStr?: string) {
  console.log('REMOVE: Weather data:', weatherData);
  if (!weatherData || !weatherData.weatherData || !weatherData.weatherData.length ) {
    return null;
  }

  // Get the target date string
  const targetDateStr = queryDateStr || formatSimpleDate(new Date());
  console.log('Target date:', targetDateStr);

  // Convert timestamps to date strings
  const weatherDataWithDates = weatherData.weatherData.map((hour: any) => ({
    ...hour,
    dateStr: formatSimpleDate(new Date(hour.timestamp))
  }));

  // Group weather data by date
  const weatherByDate = weatherDataWithDates.reduce((acc: any, hour: any) => {
    if (!acc[hour.dateStr]) {
      acc[hour.dateStr] = [];
    }
    acc[hour.dateStr].push(hour);
    return acc;
  }, {});

  // Get data for target date
  const targetDayData = weatherByDate[targetDateStr] || [];

  if (targetDayData.length === 0) {
    console.log('No data found for target date:', targetDateStr);
    console.log('Available dates:', Object.keys(weatherByDate));
    return null;
  }

  // Get the first hour's data for the target date
  const currentHour = targetDayData[0];
  if (!currentHour) {
    return null;
  }

  // Extract relevant weather parameters
  const windSpeed = currentHour.windSpeed10m;
  const windDirection = currentHour.windDirection10m;
  const cloudCover = currentHour.totalCloudCover;
  const visibility = currentHour.visibility;
  
  // Calculate flight conditions score (0-100)
  let score = 100;
  
  // Wind speed factors (ideal: 5-15 mph)
  if (windSpeed < 5) score -= 20;
  else if (windSpeed > 20) score -= 40;
  else if (windSpeed > 15) score -= 20;
  
  // Cloud coverage factors
  if (cloudCover > 80) score -= 30;
  else if (cloudCover > 60) score -= 20;
  
  // Visibility factors
  if (visibility < 3) score -= 30;
  else if (visibility < 5) score -= 20;
  
  // Determine recommendation based on score
  let recommendation: 'Low' | 'Medium' | 'High';
  if (score >= 80) recommendation = 'High';
  else if (score >= 50) recommendation = 'Medium';
  else recommendation = 'Low';
  
  return {
    recommendation,
    confidence: score,
    windSpeed,
    windDirection,
    timestamp: currentHour.timestamp // Include the actual forecast timestamp
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

    console.log('REMOVE: Message for Similary Search:', message);

    // Perform similarity search
    const similarDocs = await vectorStore.similaritySearch(message, 3);

    console.log('REMOVE: Similar docs:', similarDocs);

    // Get the most recent weather data from the similar documents
    const weatherData = similarDocs[0]?.metadata;
    console.log('REMOVE: Weather data:', weatherData);
    
    // Parse the date from the query - convert null to undefined
    const targetDateStr = parseDateFromQuery(message);
    console.log('Target date - parseDateFromQuery:', targetDateStr);
    const flightConditions = weatherData ? calculateFlightConditions(weatherData, targetDateStr || undefined) : null;

    console.log('REMOVE: Flight conditions:', flightConditions);
    // Generate response using context and user message
    const context = similarDocs.map((doc: any) => {
      // Remove forecastStart and forecastEnd, keep only forecastPeriod
      if (doc.metadata) {
        const { forecastStart, forecastEnd, ...rest } = doc.metadata;
        doc.metadata = rest;
      }
      return doc.pageContent;
    }).join('\n');
    
    // Use the forecast timestamp for the date display
    const forecastDate = flightConditions?.timestamp 
      ? new Date(flightConditions.timestamp).toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : new Date().toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
    const date = new Date()
    const currentDate = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const response = await model.call([
      { 
        role: 'system', 
        content: `You are a paragliding assistant, specialized in providing weather analysis and flight recommendations for paragliding enthusiasts. 
        Current date: ${currentDate}. 
        --IMPORTANT: Always use the current date as your reference of time for the weather forecast.(If today's day is asked always return current date)
        --You will have acces to the weather forecast for the next 7 days(you can use this to answer questions about the weather for the next 7 days).
When responding, always think from a paraglider's perspective and focus on conditions that matter most for safe and enjoyable flights.

## Current Weather Conditions
${flightConditions ? `
- Wind Speed: ${flightConditions.windSpeed} mph
- Wind Direction: ${flightConditions.windDirection}° (${getCardinalDirection(flightConditions.windDirection)})
- Flight Recommendation: ${flightConditions.recommendation}
- Confidence Score: ${flightConditions.confidence.toFixed(0)}%` : ''}

## Flight Assessment
${flightConditions ? `
Based on paragliding requirements:
- **Flight Safety Level**: ${flightConditions.recommendation}
- **Confidence**: ${flightConditions.confidence.toFixed(0)}%
- **Wind Analysis**: ${flightConditions.windSpeed} mph at ${flightConditions.windDirection}°
- **Safety Notes**: ${getSafetyNotes(flightConditions)}` : ''}

**Important:** Always emphasize safety and remind pilots to:
1. Check local conditions at launch
2. Consult with local pilots
3. Never fly beyond their skill level
4. Have proper equipment and certification

Use this format to help answer the questions ${context}`
      },
      { role: 'user', content: message }
    ]);

    // Add helper functions
    function getCardinalDirection(degrees: number): string {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const index = Math.round(((degrees % 360) / 45)) % 8;
      return directions[index];
    }

    function getSafetyNotes(conditions: any): string {
      const notes = [];
      if (conditions.windSpeed < 5) notes.push("Light wind conditions - be cautious of sink");
      else if (conditions.windSpeed > 15) notes.push("Strong winds - exercise extra caution");
      if (conditions.confidence < 50) notes.push("Marginal conditions - carefully assess before launch");
      return notes.join('. ') || 'Standard safety protocols apply';
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