import { config } from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function initPinecone() {
  try {
    console.log('Initializing Pinecone...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const indexName = process.env.PINECONE_INDEX!;
    if (!indexName) {
      throw new Error('PINECONE_INDEX environment variable is not set');
    }

    // Delete existing index if it exists
    try {
      console.log(`Deleting existing index ${indexName} if it exists...`);
      await pinecone.deleteIndex(indexName);
      console.log('Existing index deleted successfully');
    } catch (error) {
      console.log('No existing index to delete');
    }

    // Create new index with correct dimension
    console.log(`Creating new index ${indexName} with dimension 768...`);
    await pinecone.createIndex({
      name: indexName,
      dimension: 768,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log('Waiting for index to be ready...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 60 seconds

    // Verify index configuration
    const index = pinecone.Index(indexName);
    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);

    console.log('✓ Pinecone index initialized successfully');
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    throw error;
  }
}

initPinecone(); 