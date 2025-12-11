import { createClient } from 'redis';
import { config } from './env';

// Redis client type
export type RedisClientType = ReturnType<typeof createClient>;

// Production-safe reconnect settings
const REDIS_MAX_RECONNECT_ATTEMPTS = 1; // After this, stop trying
const REDIS_RECONNECT_BASE_DELAY_MS = 500; // 500ms, 1s, 1.5s, ... (capped)
const REDIS_RECONNECT_MAX_DELAY_MS = 5000; // 5s max backoff

let redisClient: RedisClientType | null = null;
let isConnecting = false;

/**
 * Get or create Redis client
 * Singleton pattern to ensure single connection
 */
export const getRedisClient = async (): Promise<RedisClientType | null> => {
    // Return null if Redis is disabled
    if (!config.redis.enabled) {
        return null;
    }

    // Return existing connected client
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    // Prevent multiple connection attempts
    if (isConnecting) {
        console.log('⏳ Redis connection already in progress...');
        return null;
    }

    try {
        isConnecting = true;
        console.log('🔌 Connecting to Redis...');

        // Plain TCP connection (no TLS) – matches Redis Cloud snippet for this DB
        // Uses a bounded reconnect strategy so it won't retry forever in production.
        redisClient = createClient({
            username: config.redis.username,
            password: config.redis.password,
            socket: {
                host: config.redis.host,
                port: config.redis.port,
                connectTimeout: 10_000, // 10 seconds
                reconnectStrategy: (retries) => {
                    if (retries >= REDIS_MAX_RECONNECT_ATTEMPTS) {
                        console.error(
                            `❌ Redis reconnect failed after ${REDIS_MAX_RECONNECT_ATTEMPTS} attempts – giving up and running without cache.`,
                        );
                        return false; // stop reconnecting
                    }

                    const delay = Math.min(
                        REDIS_RECONNECT_BASE_DELAY_MS * retries,
                        REDIS_RECONNECT_MAX_DELAY_MS,
                    );
                    console.log(
                        `🔄 Redis reconnect attempt ${retries} – retrying in ${delay}ms...`,
                    );
                    return delay;
                },
            },
        });

        // Error handler
        redisClient.on('error', (err) => {
            console.error('❌ Redis Client Error:', err.message);
        });

        // Connection handlers
        redisClient.on('connect', () => {
            console.log('🔌 Redis connecting...');
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis connected successfully');
        });

        redisClient.on('end', () => {
            console.log('🔌 Redis connection closed');
        });

        redisClient.on('reconnecting', () => {
            console.log('🔄 Redis reconnecting...');
        });

        // Connect
        await redisClient.connect();

        return redisClient;

    } catch (error: any) {
        console.error('❌ Failed to connect to Redis:', error.message);
        redisClient = null;
        return null;
    } finally {
        isConnecting = false;
    }
};

/**
 * Disconnect Redis client gracefully
 */
export const disconnectRedis = async (): Promise<void> => {
    if (redisClient && redisClient.isOpen) {
        try {
            await redisClient.quit();
            console.log('✅ Redis disconnected gracefully');
        } catch (error: any) {
            console.error('❌ Error disconnecting Redis:', error.message);
        }
        redisClient = null;
    }
};

/**
 * Check if Redis is available and connected
 */
export const isRedisAvailable = (): boolean => {
    return redisClient !== null && redisClient.isOpen;
};

