/**
 * Admin Authentication Middleware
 * 
 * Ensures only users with admin roles can access protected admin routes.
 * Authorized roles: ADMIN, SUPER_ADMIN
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import * as loggingService from '../services/loggingService';
import { config } from '../config/env';

// Admin roles - using database role system
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/**
 * Middleware to require admin access
 * Use after authenticate middleware
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Dev toggle: bypass admin guard when explicitly disabled via env.
    // NOTE: authenticate middleware still runs before this on protected routes.
    if (config.admin.disableAdminGuard) {
      next();
      return;
    }

    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const userEmail = req.user.email;
    const userRole = req.user.role;

    // Check if user has admin role
    if (!ADMIN_ROLES.includes(userRole)) {
      console.log(`⚠️  Unauthorized admin access attempt by: ${userEmail} (role: ${userRole})`);

      // Log the unauthorized access attempt
      await loggingService.logError({
        errorType: 'AUTHORIZATION_ERROR',
        severity: 'MEDIUM',
        source: 'adminAuth',
        message: `Unauthorized admin access attempt - insufficient role`,
        userId: req.user.userId,
        endpoint: req.path,
        method: req.method,
        requestData: {
          userEmail,
          userRole,
          requiredRoles: ADMIN_ROLES,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin role required'
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
 * Check if a user role is an admin (helper function)
 */
export const isAdmin = (role: string): boolean => {
  return ADMIN_ROLES.includes(role);
};

