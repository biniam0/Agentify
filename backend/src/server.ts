import app from './app';
import { config } from './config/env';
import prisma from './config/database';
import { startScheduler } from './services/schedulerService';
import { getRedisClient, disconnectRedis } from './config/redis';
import { restoreRetryStateFromRedis } from './services/callRetryService';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Initialize Redis connection (non-blocking, continues if Redis unavailable)
    if (config.redis.enabled) {
      console.log('');
      const redisClient = await getRedisClient();
      if (redisClient) {
        console.log('✅ Redis cache initialized');

        // Restore call retry state from Redis
        await restoreRetryStateFromRedis();
      } else {
        console.log('⚠️  Redis cache disabled - continuing without caching');
      }
    } else {
      console.log('ℹ️  Redis cache disabled in configuration');
    }

    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/health`);
      console.log('');

      // Start the automated meeting calls scheduler
      startScheduler();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

