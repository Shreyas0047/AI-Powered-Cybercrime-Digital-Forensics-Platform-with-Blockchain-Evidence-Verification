/**
 * MongoDB Connection Management
 * Provides scalable database connectivity with connection pooling
 */

import mongoose from 'mongoose';
import { config } from './index';
import logger from './logger';

const MONGO_MAX_POOL_SIZE = 10;
const MONGO_MIN_POOL_SIZE = 2;
const MONGO_SERVER_SELECTION_TIMEOUT = 5000;
const MONGO_SOCKET_TIMEOUT = 45000;
const RETRY_DELAY = 5000;
const MAX_RETRIES = 5;

let isConnected = false;
let retryCount = 0;

export async function connectToDatabase(): Promise<mongoose.Connection> {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return mongoose.connection;
  }

  const mongoUri = buildMongoUri();

  logger.info(`Connecting to MongoDB: ${config.mongo.database}`);

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: MONGO_MAX_POOL_SIZE,
      minPoolSize: MONGO_MIN_POOL_SIZE,
      serverSelectionTimeoutMS: MONGO_SERVER_SELECTION_TIMEOUT,
      socketTimeoutMS: MONGO_SOCKET_TIMEOUT,
    });

    isConnected = true;
    retryCount = 0;

    logger.info('MongoDB connected successfully');

    // Connection event handlers
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
      handleDisconnect();
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('reconnect', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    await handleConnectionError(error as Error);
    throw error;
  }
}

function buildMongoUri(): string {
  const { uri, database, options } = config.mongo;

  // If using Atlas or already has full URI
  if (uri.includes(database) || uri.includes('mongodb+srv')) {
    return uri;
  }

  // Build URI from components
  const uriWithoutDb = uri.replace(`/${config.mongo.database}`, '');

  if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
    const auth = `${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}`;
    return `mongodb://${auth}@${uriWithoutDb.replace('mongodb://', '')}/${database}?${options}`;
  }

  return `${uri}/${database}?${options}`;
}

async function handleDisconnect(): Promise<void> {
  logger.warn('Attempting to reconnect to MongoDB...');
  await handleConnectionError(new Error('Connection lost'));
}

async function handleConnectionError(error: Error): Promise<void> {
  if (retryCount >= MAX_RETRIES) {
    logger.error(`Max retry attempts (${MAX_RETRIES}) reached. Could not connect to MongoDB.`);
    throw error;
  }

  retryCount++;
  logger.info(`Retry attempt ${retryCount}/${MAX_RETRIES} in ${RETRY_DELAY}ms...`);

  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

  try {
    await connectToDatabase();
  } catch {
    logger.error('Retry failed');
  }
}

export async function closeDatabase(): Promise<void> {
  if (!isConnected) {
    logger.info('No active MongoDB connection to close');
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<{
  status: string;
  latency: number;
  database: string;
}> {
  const start = Date.now();

  try {
    // Ping the database
    await mongoose.connection.db?.command({ ping: 1 });
    const latency = Date.now() - start;

    return {
      status: 'connected',
      latency,
      database: config.mongo.database,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'disconnected',
      latency: -1,
      database: config.mongo.database,
    };
  }
}

export default {
  connectToDatabase,
  closeDatabase,
  checkDatabaseHealth,
};