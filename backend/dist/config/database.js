"use strict";
/**
 * MongoDB Connection Management
 * Provides scalable database connectivity with connection pooling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.closeDatabase = closeDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = require("./index");
const logger_1 = __importDefault(require("./logger"));
const MONGO_MAX_POOL_SIZE = 10;
const MONGO_MIN_POOL_SIZE = 2;
const MONGO_SERVER_SELECTION_TIMEOUT = 5000;
const MONGO_SOCKET_TIMEOUT = 45000;
const RETRY_DELAY = 5000;
const MAX_RETRIES = 5;
let isConnected = false;
let retryCount = 0;
async function connectToDatabase() {
    if (isConnected) {
        logger_1.default.info('Using existing MongoDB connection');
        return mongoose_1.default.connection;
    }
    const mongoUri = buildMongoUri();
    logger_1.default.info(`Connecting to MongoDB: ${index_1.config.mongo.database}`);
    try {
        await mongoose_1.default.connect(mongoUri, {
            maxPoolSize: MONGO_MAX_POOL_SIZE,
            minPoolSize: MONGO_MIN_POOL_SIZE,
            serverSelectionTimeoutMS: MONGO_SERVER_SELECTION_TIMEOUT,
            socketTimeoutMS: MONGO_SOCKET_TIMEOUT,
        });
        isConnected = true;
        retryCount = 0;
        logger_1.default.info('MongoDB connected successfully');
        // Connection event handlers
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.default.warn('MongoDB disconnected');
            isConnected = false;
            handleDisconnect();
        });
        mongoose_1.default.connection.on('error', (err) => {
            logger_1.default.error('MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('reconnect', () => {
            logger_1.default.info('MongoDB reconnected');
            isConnected = true;
        });
        return mongoose_1.default.connection;
    }
    catch (error) {
        logger_1.default.error('Failed to connect to MongoDB:', error);
        await handleConnectionError(error);
        throw error;
    }
}
function buildMongoUri() {
    const { uri, database, options } = index_1.config.mongo;
    // If using Atlas or already has full URI
    if (uri.includes(database) || uri.includes('mongodb+srv')) {
        return uri;
    }
    // Build URI from components
    const uriWithoutDb = uri.replace(`/${index_1.config.mongo.database}`, '');
    if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
        const auth = `${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}`;
        return `mongodb://${auth}@${uriWithoutDb.replace('mongodb://', '')}/${database}?${options}`;
    }
    return `${uri}/${database}?${options}`;
}
async function handleDisconnect() {
    logger_1.default.warn('Attempting to reconnect to MongoDB...');
    await handleConnectionError(new Error('Connection lost'));
}
async function handleConnectionError(error) {
    if (retryCount >= MAX_RETRIES) {
        logger_1.default.error(`Max retry attempts (${MAX_RETRIES}) reached. Could not connect to MongoDB.`);
        throw error;
    }
    retryCount++;
    logger_1.default.info(`Retry attempt ${retryCount}/${MAX_RETRIES} in ${RETRY_DELAY}ms...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    try {
        await connectToDatabase();
    }
    catch {
        logger_1.default.error('Retry failed');
    }
}
async function closeDatabase() {
    if (!isConnected) {
        logger_1.default.info('No active MongoDB connection to close');
        return;
    }
    try {
        await mongoose_1.default.connection.close();
        isConnected = false;
        logger_1.default.info('MongoDB connection closed');
    }
    catch (error) {
        logger_1.default.error('Error closing MongoDB connection:', error);
        throw error;
    }
}
async function checkDatabaseHealth() {
    const start = Date.now();
    try {
        // Ping the database
        await mongoose_1.default.connection.db?.command({ ping: 1 });
        const latency = Date.now() - start;
        return {
            status: 'connected',
            latency,
            database: index_1.config.mongo.database,
        };
    }
    catch (error) {
        logger_1.default.error('Database health check failed:', error);
        return {
            status: 'disconnected',
            latency: -1,
            database: index_1.config.mongo.database,
        };
    }
}
exports.default = {
    connectToDatabase,
    closeDatabase,
    checkDatabaseHealth,
};
//# sourceMappingURL=database.js.map