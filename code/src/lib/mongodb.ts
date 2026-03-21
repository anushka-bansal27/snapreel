
import { MongoClient, ServerApiVersion } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient> | null;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
      globalWithMongo._mongoClientPromise = null;
      throw err;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
}

/**
 * Global function to get the MongoDB database instance.
 */
export async function getDb() {
  try {
    if (process.env.NODE_ENV === 'development') {
      let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient> | null;
      };
      if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
          globalWithMongo._mongoClientPromise = null;
          throw err;
        });
      }
      const connectedClient = await globalWithMongo._mongoClientPromise;
      return connectedClient.db();
    } else {
      if (!clientPromise) {
        client = new MongoClient(uri, options);
        clientPromise = client.connect().catch((err) => {
          clientPromise = null;
          throw err;
        });
      }
      const connectedClient = await clientPromise;
      return connectedClient.db();
    }
  } catch (error: any) {
    console.error("MongoDB Connection Error:", error);
    throw new Error(`Could not connect to database: ${error.message}`);
  }
}

// Keep the default export signature for compatibility
export default clientPromise || (async () => {
  const db = await getDb();
  return new MongoClient(uri, options);
})();
