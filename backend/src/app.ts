import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import authRoutes from './routes/authRoutes';
import meetingRoutes from './routes/meetingRoutes';
import webhookRoutes from './routes/webhookRoutes';
import userRoutes from './routes/userRoutes';
import loggingRoutes from './routes/loggingRoutes';
import dealRoutes from './routes/dealRoutes';
import externalLogsRoutes from './routes/externalLogsRoutes';
import workflowRoutes from './routes/workflowRoutes';
import billingRoutes from './routes/billingRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { config } from './config/env';

const app: Application = express();

// Middleware - CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Skip JSON parsing for the Stripe webhook route (it needs the raw body)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/user', userRoutes);
app.use('/api/logs', loggingRoutes); // Admin-only logging dashboard routes
app.use('/api/deals', dealRoutes); // Admin deal management routes
app.use('/api/workflows', workflowRoutes); // Text-to-workflow engine routes
app.use('/api/billing', billingRoutes); // Billing & subscription routes

// External API routes (service-to-service)
app.use('/api/external/v1/logs', externalLogsRoutes);

// --- API Documentation (Swagger UI) with custom login gate ---
const docsDir = path.join(__dirname, '../../docs');

function generateDocsToken(): string {
  return crypto.createHmac('sha256', config.jwtSecret).update('agentx-docs-session').digest('hex');
}

function getDocsTokenFromCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('docs_token=')) {
      return trimmed.substring('docs_token='.length);
    }
  }
  return undefined;
}

app.post('/api/docs/auth', (req: Request, res: Response) => {
  const { email, passcode } = req.body;
  if (config.docs.password && email === config.docs.username && passcode === config.docs.password) {
    res.cookie('docs_token', generateDocsToken(), {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/docs/auth/check', (req: Request, res: Response) => {
  if (!config.docs.password) return res.json({ authenticated: true });
  const token = getDocsTokenFromCookie(req);
  res.json({ authenticated: !!token && token === generateDocsToken() });
});

app.use('/docs', (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/' || req.path === '/index.html') return next();
  if (!config.docs.password) return next();
  const token = getDocsTokenFromCookie(req);
  if (token && token === generateDocsToken()) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}, express.static(docsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

