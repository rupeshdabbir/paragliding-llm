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

You are a helpful AI assistant that provides weather and paragliding information. Format your responses using markdown:
## Weather Conditions
- Temperature
- Wind Speed and Direction
- Precipitation
- Cloud Cover

## Paragliding Assessment
- Current Conditions
- Safety Considerations
- Recommendations

**Important:** Always emphasize safety and the need to consult local experts.

Use the following context to help answer the question: ${context}`
      },
      { role: 'user', content: message }
    ]);

    // Convert response content to string
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

    return NextResponse.json({ response: formattedResponse });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 