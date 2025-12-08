/**
 * Admin Authentication Middleware
 * 
 * Ensures only admin users can access protected logging routes.
 * Currently restricted to: tamiratkebede120@gmail.com
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import * as loggingService from '../services/loggingService';

// Admin email(s) - currently only Tamirat
const ADMIN_EMAILS = ['tamiratkebede120@gmail.com'];

/**
 * Middleware to require admin access
 * Use after authenticate middleware
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const userEmail = req.user.email;

    // Check if user is in admin list
    if (!ADMIN_EMAILS.includes(userEmail)) {
      console.log(`⚠️  Unauthorized admin access attempt by: ${userEmail}`);

      // Log the unauthorized access attempt
      await loggingService.logError({
        errorType: 'AUTHORIZATION_ERROR',
        severity: 'MEDIUM',
        source: 'adminAuth',
        message: `Unauthorized admin access attempt`,
        userId: req.user.userId,
        endpoint: req.path,
        method: req.method,
        requestData: {
          userEmail,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
      return;
    }

    // User is admin - continue to the route handler
    next();
  } catch (error) {
    console.error('❌ Admin auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify admin access'
    });
  }
};

/**
 * Check if a user email is an admin (helper function)
 */
export const isAdmin = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email);
};

