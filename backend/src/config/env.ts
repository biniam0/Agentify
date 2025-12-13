import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  // CORS configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173'],
  barrierx: {
    baseUrl: process.env.BARRIERX_BASE_URL || 'https://platform.barrierx.ai',
    apiKey: process.env.BARRIERX_API_KEY || '',
    useMockData: process.env.USE_MOCK_BARRIERX === 'true',
  },
  elevenlabs: { 
    apiKey: process.env.ELEVENLABS_KEY || '',
    preAgentId: process.env.ELEVENLABS_PRE_AGENT_ID || '',
    postAgentId: process.env.ELEVENLABS_POST_AGENT_ID || '',
    phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID || '',
    webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET || '',
  },
  callRetry: {
    enabled: process.env.ENABLE_CALL_RETRY === 'true',
    maxAttempts: parseInt(process.env.CALL_RETRY_MAX_ATTEMPTS || '3'),
    intervalMs: parseInt(process.env.CALL_RETRY_INTERVAL_MS || '120000'), // 2 minutes default
  },
  automation: {
    // Toggle between 'authenticated' (DB users) or 'bulk' (all users from API)
    mode: (process.env.AUTOMATION_MODE || 'authenticated') as 'authenticated' | 'bulk',
    // Optional: comma-separated tenant slugs to filter (leave empty for all)
    targetTenants: process.env.TARGET_TENANT_SLUGS?.split(',').filter(Boolean) || [],
    // Filter deals by update time (in days) - skips stale deals
    dealUpdateWindowDays: parseInt(process.env.DEAL_UPDATE_WINDOW_DAYS || '60'),
  },
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || '',
  },
};

