"use strict";
/**
 * Database Optimization Service
 * MongoDB indexing and query optimization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryOptimizer = exports.indexManager = exports.DatabaseIndexManager = void 0;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.getConnectionPoolStats = getConnectionPoolStats;
exports.initializeDatabaseOptimizations = initializeDatabaseOptimizations;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Database Index Manager
 */
class DatabaseIndexManager {
    indexes = [];
    /**
     * Register indexes for a collection
     */
    registerIndexes(definition) {
        this.indexes.push(definition);
        logger_1.default.debug(`Registered index definition for ${definition.collection}`);
    }
    /**
     * Create all registered indexes
     */
    async createAllIndexes() {
        for (const def of this.indexes) {
            try {
                const collection = mongoose_1.default.connection.collection(def.collection);
                for (const [name, index] of Object.entries(def.indexes)) {
                    const keys = typeof index === 'object' ? index : { [name]: index };
                    await collection.createIndex(keys, { ...(def.options || {}), name });
                }
                logger_1.default.info(`Created indexes for ${def.collection}`);
            }
            catch (error) {
                logger_1.default.error(`Failed to create indexes for ${def.collection}`, {
                    error: error.message,
                });
            }
        }
    }
    /**
     * Get index statistics for a collection
     */
    async getIndexStats(collectionName) {
        const collection = mongoose_1.default.connection.collection(collectionName);
        return collection.indexes();
    }
    /**
     * Drop all indexes for a collection (use with caution)
     */
    async dropAllIndexes(collectionName) {
        const collection = mongoose_1.default.connection.collection(collectionName);
        await collection.dropIndexes();
        logger_1.default.warn(`Dropped all indexes for ${collectionName}`);
    }
}
exports.DatabaseIndexManager = DatabaseIndexManager;
// Singleton instance
exports.indexManager = new DatabaseIndexManager();
/**
 * Investigation indexes
 */
exports.indexManager.registerIndexes({
    collection: 'investigations',
    indexes: {
        'status-createdAt': { status: 1, createdAt: -1 },
        'priority-createdAt': { priority: 1, createdAt: -1 },
        'type-status': { type: 1, status: 1 },
        'assignedTo-status': { assignedTo: 1, status: 1 },
        'tags': 1,
        'evidenceCount': 1,
        'lastActivityAt': -1,
        'search_text': { title: 'text', description: 'text' },
    },
    options: { background: true }
});
/**
 * Evidence indexes
 */
exports.indexManager.registerIndexes({
    collection: 'evidences',
    indexes: {
        'investigationId-createdAt': { investigationId: 1, createdAt: -1 },
        'investigationId-classification': { investigationId: 1, classification: 1 },
        'fileHash': 1,
        'fileType': 1,
        'classification-status': { classification: 1, analysisStatus: 1 },
        'integrityStatus': 1,
        'createdAt': -1,
        'source': 1,
        'tags': 1,
    },
    options: { background: true }
});
/**
 * Alerts indexes
 */
exports.indexManager.registerIndexes({
    collection: 'alerts',
    indexes: {
        'severity-status': { severity: 1, status: 1 },
        'status-createdAt': { status: 1, createdAt: -1 },
        'type-severity': { type: 1, severity: 1 },
        'investigationId': 1,
        'source': 1,
        'acknowledgedBy': 1,
    },
    options: { background: true }
});
/**
 * User indexes
 */
exports.indexManager.registerIndexes({
    collection: 'users',
    indexes: {
        'username': 1,
        'email': 1,
        'role': 1,
        'createdAt': -1,
    },
    options: { background: true }
});
/**
 * Audit log indexes
 */
exports.indexManager.registerIndexes({
    collection: 'auditlogs',
    indexes: {
        'userId-createdAt': { userId: 1, createdAt: -1 },
        'action-createdAt': { action: 1, createdAt: -1 },
        'resourceType-resourceId': { resourceType: 1, resourceId: 1 },
        'ipAddress': 1,
        'correlationId': 1,
    },
    options: { background: true }
});
/**
 * Sandbox session indexes
 */
exports.indexManager.registerIndexes({
    collection: 'sandboxesessions',
    indexes: {
        'investigationId': 1,
        'status-createdAt': { status: 1, createdAt: -1 },
        'vmName': 1,
    },
    options: { background: true }
});
/**
 * Telemetry indexes
 */
exports.indexManager.registerIndexes({
    collection: 'telemetries',
    indexes: {
        'investigationId-timestamp': { investigationId: 1, timestamp: -1 },
        'sessionId-timestamp': { sessionId: 1, timestamp: -1 },
        'eventType-timestamp': { eventType: 1, timestamp: -1 },
        'processId': 1,
        'timestamp': -1,
    },
    options: { background: true, expireAfterSeconds: 604800 } // 7 days TTL
});
/**
 * IOC (Indicator of Compromise) indexes
 */
exports.indexManager.registerIndexes({
    collection: 'iocs',
    indexes: {
        'type-value': { type: 1, value: 1 },
        'severity-status': { severity: 1, status: 1 },
        'classification': 1,
        'source': 1,
        'firstSeen': -1,
        'lastSeen': -1,
        'confidence': -1,
        'tags': 1,
        'investigationIds': 1,
    },
    options: { background: true }
});
/**
 * Threat correlations indexes
 */
exports.indexManager.registerIndexes({
    collection: 'threatcorrelations',
    indexes: {
        'investigationId': 1,
        'type': 1,
        'severity': 1,
        'createdAt': -1,
    },
    options: { background: true }
});
/**
 * Blockchain verification indexes
 */
exports.indexManager.registerIndexes({
    collection: 'blockchainverifications',
    indexes: {
        'evidenceId': 1,
        'status': 1,
        'createdAt': -1,
        'network': 1,
    },
    options: { background: true }
});
/**
 * Chain of custody indexes
 */
exports.indexManager.registerIndexes({
    collection: 'chainofcustodies',
    indexes: {
        'evidenceId': 1,
        'eventType': 1,
        'custodian': 1,
        'timestamp': -1,
    },
    options: { background: true }
});
/**
 * Query optimization helpers
 */
class QueryOptimizer {
    /**
     * Create a projection for common fields
     */
    static createProjection(fields) {
        const projection = {};
        for (const field of fields) {
            projection[field] = 1;
        }
        return projection;
    }
    /**
     * Build pagination query
     */
    static buildPaginationQuery(page, limit) {
        const skip = (page - 1) * limit;
        return { skip, limit: Math.min(limit, 100) };
    }
    /**
     * Build sort option
     */
    static buildSortOption(sortBy, order) {
        if (!sortBy)
            return { createdAt: -1 };
        return { [sortBy]: order === 'asc' ? 1 : -1 };
    }
    /**
     * Build date range filter
     */
    static buildDateRangeFilter(field, startDate, endDate) {
        const filter = {};
        if (startDate || endDate) {
            filter[field] = {};
            if (startDate)
                filter[field].$gte = startDate;
            if (endDate)
                filter[field].$lte = endDate;
        }
        return filter;
    }
    /**
     * Build text search query
     */
    static buildTextSearchQuery(query, fields) {
        if (!query)
            return {};
        return {
            $or: fields.map(field => ({
                [field]: { $regex: query, $options: 'i' }
            }))
        };
    }
    /**
     * Build aggregation pipeline for analytics
     */
    static buildAnalyticsPipeline(groupBy, dateField, startDate, endDate) {
        const match = {};
        if (startDate || endDate) {
            match[dateField] = {};
            if (startDate)
                match[dateField].$gte = startDate;
            if (endDate)
                match[dateField].$lte = endDate;
        }
        return [
            { $match: match },
            {
                $group: {
                    _id: `$${groupBy}`,
                    count: { $sum: 1 },
                    first: { $first: `$${dateField}` },
                    last: { $last: `$${dateField}` },
                }
            },
            { $sort: { count: -1 } },
            { $limit: 100 }
        ];
    }
}
exports.QueryOptimizer = QueryOptimizer;
/**
 * Database health check
 */
async function checkDatabaseHealth() {
    const start = Date.now();
    try {
        // Ping the database
        await mongoose_1.default.connection.db?.admin().ping();
        const responseTime = Date.now() - start;
        // Get stats
        const stats = await mongoose_1.default.connection.db?.stats();
        const collectionsCount = stats?.collections || 0;
        // Count indexes
        let indexesCount = 0;
        const collections = await mongoose_1.default.connection.db?.listCollections().toArray();
        for (const coll of collections || []) {
            const indexes = await mongoose_1.default.connection.collection(coll.name).indexes();
            indexesCount += indexes.length;
        }
        return {
            status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'down',
            responseTime,
            indexesCount,
            collectionsCount,
        };
    }
    catch (error) {
        logger_1.default.error('Database health check failed', {
            error: error.message,
        });
        return {
            status: 'down',
            responseTime: Date.now() - start,
            indexesCount: 0,
            collectionsCount: 0,
        };
    }
}
/**
 * Connection pool monitoring
 */
function getConnectionPoolStats() {
    const conn = mongoose_1.default.connections[0];
    const buffers = conn?.buffer ? Object.keys(conn.buffer).length : 0;
    return {
        connections: conn?.readyState === 1 ? 1 : 0,
        buffers,
    };
}
/**
 * Initialize database optimizations
 */
async function initializeDatabaseOptimizations() {
    try {
        // Create all indexes
        await exports.indexManager.createAllIndexes();
        // Check database health
        const health = await checkDatabaseHealth();
        logger_1.default.info('Database optimizations initialized', {
            health: health.status,
            collections: health.collectionsCount,
            indexes: health.indexesCount,
        });
    }
    catch (error) {
        logger_1.default.error('Failed to initialize database optimizations', {
            error: error.message,
        });
    }
}
//# sourceMappingURL=database-optimization.service.js.map