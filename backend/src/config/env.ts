import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  barrierxBaseUrl: process.env.BARRIERX_BASE_URL || 'https://dummy-barrierx-api.com',
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_KEY || '',
    preAgentId: process.env.ELEVENLABS_PRE_AGENT_ID || '',
    postAgentId: process.env.ELEVENLABS_POST_AGENT_ID || '',
    phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID || '',
    webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET || 'dummy-secret',
  },
};

