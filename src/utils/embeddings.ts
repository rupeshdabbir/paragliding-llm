import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

// Initialize the embeddings model
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY!,
  modelName: 'models/embedding-001'
});

// Function to generate embeddings for a text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await embeddings.embedQuery(text);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
} 