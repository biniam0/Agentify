import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  admin: {
    // When true, admin-only guards (e.g., requireAdmin) are bypassed.
    // Only allowed in development; silently ignored in production.
    disableAdminGuard:
      process.env.DISABLE_ADMIN_GUARD === 'true' &&
      (process.env.NODE_ENV || 'development') !== 'production',
  },
  // CORS configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173'],
  barrierx: {
    baseUrl: process.env.BARRIERX_BASE_URL || 'https://platform.barrierx.ai',
    apiKey: process.env.BARRIERX_API_KEY || '',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_KEY || '',
    preAgentId: process.env.ELEVENLABS_PRE_AGENT_ID || '',
    postAgentId: process.env.ELEVENLABS_POST_AGENT_ID || '',
    phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID || '',
    webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET || '',

    // Info Gathering Agent (single unified agent with 3 server tools)
    infoGatheringAgentId: process.env.ELEVENLABS_INFO_GATHERING_AGENT_ID || '',
    
    // NL to Workflow Agent (calls sales reps on behalf of managers)
    nlWorkflowAgentId: process.env.ELEVENLABS_NL_WORKFLOW_AGENT_ID || '',
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
    // Optional: comma-separated deal pipelines to filter (e.g., "1. Sales Pipeline,Sales Pipeline")
    dealPipelines: process.env.DEAL_PIPELINES?.split(',').map(p => p.trim()).filter(Boolean) || [],
  },
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    smsFromNumber: process.env.TWILIO_SMS_FROM || '',
    // Enable/disable SMS notifications (set to 'true' to enable)
    smsEnabled: process.env.TWILIO_SMS_ENABLED === 'true',
    // Minutes before meeting to send SMS notification (default: 30 minutes)
    notificationMinutesBefore: parseInt(process.env.SMS_NOTIFICATION_MINUTES_BEFORE || '30'),
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    enabled: process.env.SLACK_ENABLED === 'true',
  },
  docs: {
    username: process.env.DOCS_USERNAME || 'admin',
    password: process.env.DOCS_PASSWORD || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    prices: {
      pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
        annual: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
      },
      business: {
        monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
        annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || '',
      },
      enterprise: {
        monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
        annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || '',
      },
    },
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

