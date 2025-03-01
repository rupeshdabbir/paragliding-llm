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
      { role: 'system', content: `Today is ${today}. User's location: ${locationStr}. Use the following context to help answer the question: ${context}` },
      { role: 'user', content: message }
    ]);

    return NextResponse.json({ response: response.content });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 