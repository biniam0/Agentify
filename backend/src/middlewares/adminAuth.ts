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
 * Middleware to require SUPER_ADMIN access.
 * Use after authenticate middleware.
 */
export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (config.admin.disableAdminGuard) {
      next();
      return;
    }

    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      console.log(`⚠️  Unauthorized super-admin access attempt by: ${req.user.email} (role: ${req.user.role})`);

      await loggingService.logError({
        errorType: 'AUTHORIZATION_ERROR',
        severity: 'HIGH',
        source: 'adminAuth',
        message: `Unauthorized super-admin access attempt - insufficient role`,
        userId: req.user.userId,
        endpoint: req.path,
        method: req.method,
        requestData: {
          userEmail: req.user.email,
          userRole: req.user.role,
          requiredRole: 'SUPER_ADMIN',
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Super admin role required'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('❌ Super admin auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify super admin access'
    });
  }
};

/**
 * Middleware to require completed onboarding.
 * Use after authenticate middleware.
 */
export const requireOnboarded = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const { default: prisma } = await import('../config/database');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { onboardingCompleted: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.onboardingCompleted) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Onboarding not completed'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('❌ Onboarding check middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify onboarding status'
    });
  }
};

/**
 * Check if a user role is an admin (helper function)
 */
export const isAdmin = (role: string): boolean => {
  return ADMIN_ROLES.includes(role);
};

