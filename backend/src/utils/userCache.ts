/**
 * User Caching Utility
 * 
 * Provides in-memory caching for user queries to reduce database load.
 * Uses LRU-like strategy with TTL to ensure data freshness.
 */

import prisma from '../config/database';

interface CachedUser {
    data: any;
    expiresAt: number;
}

// Simple in-memory cache with TTL
const userCache = new Map<string, CachedUser>();

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Prevent memory leaks

/**
 * Get user from cache or database
 * @param userId - User ID to fetch
 * @param select - Fields to select (Prisma select object)
 * @returns User data or null
 */
export const getCachedUser = async (userId: string, select?: any) => {
    const cacheKey = `user:${userId}:${JSON.stringify(select || {})}`;
    const now = Date.now();

    // Check cache first
    const cached = userCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return cached.data;
    }

    // Cache miss or expired - fetch from database
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: select || undefined,
        });

        // Cache the result
        if (user) {
            // Clean up old entries if cache is too large
            if (userCache.size >= MAX_CACHE_SIZE) {
                cleanupExpiredEntries();
            }

            userCache.set(cacheKey, {
                data: user,
                expiresAt: now + CACHE_TTL_MS,
            });
        }

        return user;
    } catch (error) {
        console.error('❌ Failed to fetch user:', error);
        return null;
    }
};

/**
 * Invalidate cached user data
 * Call this after user updates
 */
export const invalidateUserCache = (userId: string) => {
    // Remove all cache entries for this user (different select patterns)
    const keysToDelete: string[] = [];

    userCache.forEach((_, key) => {
        if (key.startsWith(`user:${userId}:`)) {
            keysToDelete.push(key);
        }
    });

    keysToDelete.forEach(key => userCache.delete(key));
};

/**
 * Clear all cached users
 * Useful for testing or after bulk operations
 */
export const clearUserCache = () => {
    userCache.clear();
};

/**
 * Clean up expired cache entries
 * Helps prevent memory leaks
 */
const cleanupExpiredEntries = () => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    userCache.forEach((value, key) => {
        if (value.expiresAt <= now) {
            keysToDelete.push(key);
        }
    });

    keysToDelete.forEach(key => userCache.delete(key));

    if (keysToDelete.length > 0) {
        console.log(`🧹 Cleaned up ${keysToDelete.length} expired user cache entries`);
    }
};

// Periodic cleanup (every 10 minutes)
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);

/**
 * Get cache statistics (for monitoring)
 */
export const getUserCacheStats = () => {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    userCache.forEach((value) => {
        if (value.expiresAt > now) {
            validEntries++;
        } else {
            expiredEntries++;
        }
    });

    return {
        totalEntries: userCache.size,
        validEntries,
        expiredEntries,
        maxSize: MAX_CACHE_SIZE,
        ttlMs: CACHE_TTL_MS,
    };
};

