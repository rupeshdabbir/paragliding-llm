import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbedding } from '@/utils/embeddings';

// Helper function to format date as YYYY-MM-DD in PST
function formatDateYYYYMMDD(date: Date): string {
  // Get date components in PST
  const pstDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');
  
  // Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
}

// Helper function to parse date from query
function parseDateFromQuery(message: string): string | null {
  // Create dates in PST timezone
  const nowPST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  console.log('Current PST time:', nowPST.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  const todayPST = new Date(nowPST);
  const tomorrowPST = new Date(nowPST);
  tomorrowPST.setDate(todayPST.getDate() + 1);
  
  // Convert message to lowercase for easier matching
  const lowerMessage = message.toLowerCase();
  
  // Handle relative dates
  if (lowerMessage.includes('tomorrow')) {
    const targetDate = formatDateYYYYMMDD(tomorrowPST);
    console.log('Parsed date (tomorrow PST):', targetDate);
    return targetDate;
  }
  
  if (lowerMessage.includes('today')) {
    const targetDate = formatDateYYYYMMDD(todayPST);
    console.log('Parsed date (today PST):', targetDate);
    return targetDate;
  }
  
  if (lowerMessage.includes('this weekend')) {
    const saturday = new Date(todayPST);
    saturday.setDate(todayPST.getDate() + (6 - todayPST.getDay())); // Get next Saturday
    const targetDate = formatDateYYYYMMDD(saturday);
    console.log('Parsed date (weekend PST):', targetDate);
    return targetDate;
  }
  
  // Handle specific days of the week
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (const day of daysOfWeek) {
    if (lowerMessage.includes(day)) {
      const targetDayIndex = daysOfWeek.indexOf(day);
      const currentDayIndex = todayPST.getDay();
      const daysUntilTarget = (targetDayIndex - currentDayIndex + 7) % 7;
      const targetDate = new Date(todayPST);
      targetDate.setDate(todayPST.getDate() + daysUntilTarget);
      const formattedDate = formatDateYYYYMMDD(targetDate);
      console.log(`Parsed date (${day} PST):`, formattedDate);
      return formattedDate;
    }
  }
  
  // Try to extract date patterns like MM/DD/YYYY or YYYY-MM-DD
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/     // YYYY-MM-DD
  ];
  
  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      try {
        let date;
        if (pattern.toString().includes('\\d{4}-')) {
          // YYYY-MM-DD format
          date = new Date(match[0]);
        } else {
          // MM/DD/YYYY format
          const [_, month, day, year] = match;
          date = new Date(`${year}-${month}-${day}`);
        }
        
        if (!isNaN(date.getTime())) {
          // Convert to PST
          const formattedDate = formatDateYYYYMMDD(date);
          console.log('Parsed date (explicit PST):', formattedDate);
          return formattedDate;
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }
  }
  
  // Default to today in PST if no date is found
  const defaultDate = formatDateYYYYMMDD(todayPST);
  console.log('No date found in query, using default (today PST):', defaultDate);
  return defaultDate;
}

function calculateFlightConditions(weatherData: any) {
  if (!weatherData?.metadata) {
    console.log('Invalid weather data structure:', weatherData);
    return null;
  }

  // Extract relevant weather parameters from metadata
  const windSpeed = parseFloat(weatherData.metadata.averageWindSpeed);
  const maxWindSpeed = parseFloat(weatherData.metadata.maxWindSpeed);
  const cloudCover = parseFloat(weatherData.metadata.averageCloudCover);
  const temperature = parseFloat(weatherData.metadata.averageTemp);
  const date = weatherData.metadata.forecastDate;
  const dayOfWeek = weatherData.metadata.dayOfWeek;

  // Calculate flight conditions score
  let score = 0;
  let reasons = [];

  // Wind speed assessment (0-15 mph ideal, 15-20 marginal, >20 not suitable)
  if (windSpeed <= 15) {
    score += 0.4;
  } else if (windSpeed <= 20) {
    score += 0.2;
  }
  if (maxWindSpeed > 20) {
    reasons.push('Maximum wind speed too high');
  }

  // Cloud cover assessment (<70% ideal)
  if (cloudCover < 70) {
    score += 0.3;
  } else {
    reasons.push('Cloud cover too high');
  }

  // Temperature assessment (40-80°F ideal)
  if (temperature >= 40 && temperature <= 80) {
    score += 0.3;
  } else {
    reasons.push(temperature < 40 ? 'Temperature too cold' : 'Temperature too hot');
  }

  // Determine recommendation
  let recommendation: 'Low' | 'Medium' | 'High';
  if (score >= 0.8) recommendation = 'High';
  else if (score >= 0.5) recommendation = 'Medium';
  else recommendation = 'Low';

  return {
    date,
    dayOfWeek,
    temperature,
    windSpeed,
    maxWindSpeed,
    cloudCover,
    flightConditions: {
      recommendation,
      confidence: score
    },
    reasons: reasons.length > 0 ? reasons : ['Conditions look suitable for flying']
  };
}

// Initialize Pinecone client
async function initPinecone() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  return pinecone;
}

export async function POST(req: NextRequest) {
  try {
    const { message, location } = await req.json();

    // Initialize Pinecone
    const pinecone = await initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX!);

    // Parse the date from the query
    const targetDate = parseDateFromQuery(message);
    console.log('Target date for query:', targetDate);

    // Generate embedding for the query
    const embedding = await generateEmbedding(message);

    // Search Pinecone with metadata filter for the specific date
    const queryResponse = await index.query({
      vector: embedding,
      topK: 15,
      filter: {
        forecastDate: { $eq: targetDate }
      },
      includeMetadata: true
    });

    const similarDocs = queryResponse.matches || [];
    console.log('Similar documents:', similarDocs);
    console.log(`Found ${similarDocs.length} similar documents for date ${targetDate}`);

    // Get the most recent weather data from the similar documents
    const weatherData = similarDocs.length > 0 ? similarDocs[0] : null;
    const flightConditions = weatherData ? calculateFlightConditions(weatherData) : null;

    // Generate response using context and user message
    const context = similarDocs.map((doc: any) => doc.metadata.text).join('\n\n');

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Prepare the prompt
    const prompt = `
You are a helpful paragliding assistant that provides weather information and flying advice.

Today's date is ${new Date().toLocaleDateString()}.

The user asked: "${message}"

Here is the weather forecast information for ${targetDate}:
${context || "No weather data available for this date."}

${flightConditions ? `
Current weather conditions for ${flightConditions.dayOfWeek}, ${flightConditions.date}:
- Temperature: ${flightConditions.temperature}°F
- Wind Speed: ${flightConditions.windSpeed} mph (Max: ${flightConditions.maxWindSpeed} mph)
- Cloud Cover: ${flightConditions.cloudCover}%
- Flight Conditions: ${flightConditions.flightConditions.recommendation} (Confidence: ${(flightConditions.flightConditions.confidence * 100).toFixed(0)}%)
- Assessment: ${flightConditions.reasons.join(', ')}
` : 'No specific weather conditions available for this query.'}

Please provide a helpful response about the weather and flying conditions based on this information. 
If the forecast shows unsuitable conditions, suggest when conditions might improve if that information is available.
If no weather data is available for the requested date or location, please inform the user.
`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return NextResponse.json({
      response,
      weatherData: flightConditions
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
} 