import { Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';
import { invalidateUserCache } from '../utils/userCache';
import * as loggingService from '../services/loggingService';

const PLATFORM_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const;
type PlatformRole = (typeof PLATFORM_ROLES)[number];

const isPlatformRole = (value: unknown): value is PlatformRole =>
  typeof value === 'string' && (PLATFORM_ROLES as readonly string[]).includes(value);

export const listPlatformUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, search, limit, offset } = req.query as Record<string, string | undefined>;

    const limitNum = Math.min(parseInt(limit ?? '50', 10) || 50, 200);
    const offsetNum = Math.max(parseInt(offset ?? '0', 10) || 0, 0);

    const where: Record<string, unknown> = {};
    if (role && isPlatformRole(role)) {
      where.role = role;
    }
    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tenantSlug: true,
          isEnabled: true,
          avatarUrl: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      users,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('List platform users error:', error);
    res.status(500).json({ error: 'Failed to list platform users' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user?.userId;
    if (!requesterId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { role } = (req.body ?? {}) as { role?: unknown };

    if (!isPlatformRole(role)) {
      res.status(400).json({
        error: `Invalid role. Must be one of: ${PLATFORM_ROLES.join(', ')}`,
      });
      return;
    }

    if (id === requesterId) {
      res.status(400).json({ error: 'You cannot change your own role.' });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (target.role === role) {
      res.json({
        success: true,
        user: target,
        message: 'No change',
      });
      return;
    }

    if (target.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
      if (superAdminCount <= 1) {
        res.status(400).json({
          error: 'Cannot demote the last SUPER_ADMIN. Promote another user first.',
        });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantSlug: true,
        isEnabled: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    invalidateUserCache(id);

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { email: true, name: true },
    });

    // Logged as AUTHORIZATION_ERROR (existing enum) so it surfaces in the admin
    // Audit Log feed alongside unauthorized access attempts. Severity MEDIUM
    // signals a successful but sensitive action.
    await loggingService.logError({
      errorType: 'AUTHORIZATION_ERROR',
      severity: 'MEDIUM',
      source: 'adminUserController',
      message: `Role changed: ${target.email} ${target.role} → ${role}`,
      userId: requesterId,
      userEmail: requester?.email ?? undefined,
      userName: requester?.name ?? undefined,
      endpoint: req.path,
      method: req.method,
      requestData: {
        actorEmail: requester?.email,
        targetUserId: target.id,
        targetEmail: target.email,
        previousRole: target.role,
        newRole: role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};
