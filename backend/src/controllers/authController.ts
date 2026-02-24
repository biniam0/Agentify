import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import * as barrierxService from '../services/barrierxService';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middlewares/auth';
import { invalidateUserCache } from '../utils/userCache';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Call BarrierX API to authenticate
    const barrierxLoginResponse = await barrierxService.login(email, password);

    if (!barrierxLoginResponse || !barrierxLoginResponse.ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Decode JWT to extract user info (no signature verification needed, just reading data)
    const decoded = jwt.decode(barrierxLoginResponse.accessToken) as any;
    
    if (!decoded || !decoded.user_metadata) {
      console.error('❌ Invalid JWT token format:', decoded);
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Extract user details from JWT
    const firstName = decoded.user_metadata.first_name || '';
    const lastName = decoded.user_metadata.last_name || '';
    const userName = `${firstName} ${lastName}`.trim() || email.split('@')[0];
    
    console.log(`✅ User info extracted from JWT: ${userName} (${decoded.email})`);
    
    const barrierxUser = {
      id: barrierxLoginResponse.userId,
      name: userName,
      email: decoded.email || email,
      isAuth: true,
      isEnabled: true,
    };

    // Try to find user by barrierxUserId first, then by email
    let user = await prisma.user.findUnique({
      where: { barrierxUserId: barrierxLoginResponse.userId },
    });

    if (!user) {
      // Check if user exists with this email
      user = await prisma.user.findUnique({
        where: { email: barrierxUser.email },
      });
    }

    if (user) {
      // User exists - update their information
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: barrierxUser.name,
          email: barrierxUser.email,
          barrierxUserId: barrierxLoginResponse.userId,
          tenantSlug: barrierxLoginResponse.tenants[0]?.slug || 'agent-call',
          isAuth: barrierxUser.isAuth,
          isEnabled: barrierxUser.isEnabled,
        },
      });
      
      // ⚡ Invalidate cache after update
      invalidateUserCache(user.id);
    } else {
      // User doesn't exist - create new user
      user = await prisma.user.create({
        data: {
          name: barrierxUser.name,
          email: barrierxUser.email,
          barrierxUserId: barrierxLoginResponse.userId,
          tenantSlug: barrierxLoginResponse.tenants[0]?.slug || 'agent-call',
          isAuth: barrierxUser.isAuth,
          isEnabled: barrierxUser.isEnabled,
        },
      });
    }

    // Generate JWT token (or use BarrierX accessToken)
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAuth: user.isAuth,
        isEnabled: user.isEnabled,
      },
      // Include BarrierX response data
      barrierx: {
        accessToken: barrierxLoginResponse.accessToken,
        refreshToken: barrierxLoginResponse.refreshToken,
        expiresAt: barrierxLoginResponse.expiresAt,
        tenants: barrierxLoginResponse.tenants,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    // Call BarrierX refresh endpoint
    const barrierxRefreshResponse = await barrierxService.refreshAccessToken(refreshToken);

    if (!barrierxRefreshResponse || !barrierxRefreshResponse.ok) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { barrierxUserId: barrierxRefreshResponse.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate new JWT for your backend (optional - could reuse existing)
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAuth: user.isAuth,
        isEnabled: user.isEnabled,
      },
      barrierx: {
        accessToken: barrierxRefreshResponse.accessToken,
        refreshToken: barrierxRefreshResponse.refreshToken,
        expiresAt: barrierxRefreshResponse.expiresAt,
        tenants: barrierxRefreshResponse.tenants,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

