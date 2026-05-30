"use strict";
/**
 * Central Configuration Module
 * Loads and validates environment variables for the NyxTrace
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const logger_1 = __importDefault(require("./logger"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
function getEnv(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined && defaultValue === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value !== undefined ? value : (defaultValue !== undefined ? defaultValue : '');
}
function getEnvNumber(key, defaultValue) {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue || 0;
}
function getEnvBool(key, defaultValue = false) {
    const value = process.env[key];
    if (!value)
        return defaultValue;
    return value.toLowerCase() === 'true';
}
exports.config = {
    server: {
        port: getEnvNumber('PORT', 3000),
        nodeEnv: getEnv('NODE_ENV', 'development'),
        apiVersion: getEnv('API_VERSION', 'v1'),
        baseUrl: getEnv('BASE_URL', 'http://localhost:3000'),
    },
    mongo: {
        uri: getEnv('MONGODB_URI', ''),
        database: getEnv('MONGODB_DATABASE', 'forensics_platform'),
        options: getEnv('MONGODB_OPTIONS', 'maxPoolSize=10&wtimeout=30000'),
    },
    jwt: {
        secret: getEnv('JWT_SECRET'),
        expiry: getEnv('JWT_EXPIRY', '7d'),
        refreshSecret: getEnv('JWT_REFRESH_SECRET'),
        refreshExpiry: getEnv('JWT_REFRESH_EXPIRY', '30d'),
    },
    security: {
        corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
        rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
        rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    },
    upload: {
        maxSize: getEnvNumber('UPLOAD_MAX_SIZE', 104857600),
        dest: getEnv('UPLOAD_DEST', './uploads'),
        allowedTypes: getEnv('ALLOWED_FILE_TYPES', '.json,.zip,.pdf,.log,.txt,.png,.jpg,.jpeg').split(','),
    },
    evidence: {
        path: getEnv('EVIDENCE_PATH', './uploads/evidence'),
        reportsPath: getEnv('REPORTS_PATH', './uploads/reports'),
        sandboxLogsPath: getEnv('SANDBOX_LOGS_PATH', './uploads/sandbox-logs'),
    },
    logging: {
        level: getEnv('LOG_LEVEL', 'info'),
        filePath: getEnv('LOG_FILE_PATH', './logs'),
        maxSize: getEnv('LOG_MAX_SIZE', '10m'),
        maxFiles: getEnvNumber('LOG_MAX_FILES', 30),
    },
    aiService: {
        url: getEnv('AI_SERVICE_URL', 'http://localhost:8000'),
        enabled: getEnvBool('AI_SERVICE_ENABLED', false),
    },
    blockchain: {
        enabled: getEnvBool('BLOCKCHAIN_ENABLED', false),
        network: getEnv('BLOCKCHAIN_NETWORK', 'sepolia'),
        rpcUrl: getEnv('BLOCKCHAIN_RPC_URL', 'https://sepolia.infura.io/v3/your-project-id'),
        contractAddress: getEnv('BLOCKCHAIN_CONTRACT_ADDRESS', ''),
        chainId: getEnvNumber('BLOCKCHAIN_CHAIN_ID', 11155111),
        explorerUrl: getEnv('BLOCKCHAIN_EXPLORER_URL', 'https://sepolia.etherscan.io'),
    },
    verification: {
        hashAlgorithm: 'sha256',
        verificationBatchSize: getEnvNumber('VERIFICATION_BATCH_SIZE', 10),
        autoVerifyOnUpload: getEnvBool('AUTO_VERIFY_ON_UPLOAD', false),
        storeHashesOnChain: getEnvBool('STORE_HASHES_ON_CHAIN', false),
    },
    otpDevMode: getEnvBool('OTP_DEV_MODE', false),
    otpTokenSecret: getEnv('OTP_TOKEN_SECRET', ''),
};
// Validation
function validateConfig() {
    const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        logger_1.default.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    }
}
exports.default = exports.config;
//# sourceMappingURL=index.js.map