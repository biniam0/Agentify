/**
 * External Logs API Routes
 * 
 * Phase 1: Test endpoint only
 */

import { Router } from 'express';
import { authenticateService, requireScope, ServiceAuthRequest } from '../middlewares/serviceAuth';
import { Response } from 'express';

const router = Router();

// Test endpoint to verify API key authentication
router.get(
  '/test',
  authenticateService,
  requireScope('logs:read'),
  (req: ServiceAuthRequest, res: Response) => {
    res.json({
      success: true,
      message: 'API key authentication working!',
      service: req.service?.name,
      scopes: req.service?.scopes,
      timestamp: new Date().toISOString()
    });
  }
);

export default router;

