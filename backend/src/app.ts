import express, { Application } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import meetingRoutes from './routes/meetingRoutes';
import webhookRoutes from './routes/webhookRoutes';
import userRoutes from './routes/userRoutes';
import loggingRoutes from './routes/loggingRoutes';
import externalLogsRoutes from './routes/externalLogsRoutes';
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/user', userRoutes);
app.use('/api/logs', loggingRoutes); // Admin-only logging dashboard routes

// External API routes (service-to-service)
app.use('/api/external/v1/logs', externalLogsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

