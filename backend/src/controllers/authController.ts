import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import * as barrierxService from '../services/barrierxService';
import { generateAccessToken, generateRefreshTokenValue, REFRESH_TOKEN_MAX_AGE } from '../utils/jwt';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies';
import { AuthRequest } from '../middlewares/auth';
import { invalidateUserCache } from '../utils/userCache';

async function issueTokens(
  res: Response,
  userId: string,
  email: string,
  role: string,
  tenantSlug: string,
  barrierxUserId: string,
) {
  const accessToken = generateAccessToken({ userId, email, role, tenantSlug, barrierxUserId });
  const refreshTokenValue = generateRefreshTokenValue();

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
    },
  });

  setAuthCookies(res, accessToken, refreshTokenValue);
  return accessToken;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const barrierxLoginResponse = await barrierxService.login(email, password);

    if (!barrierxLoginResponse || !barrierxLoginResponse.ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const decoded = jwt.decode(barrierxLoginResponse.accessToken) as any;
    
    if (!decoded || !decoded.user_metadata) {
      console.error('❌ Invalid JWT token format:', decoded);
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

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

    let user = await prisma.user.findUnique({
      where: { barrierxUserId: barrierxLoginResponse.userId },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: barrierxUser.email },
      });
    }

    if (user) {
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
      invalidateUserCache(user.id);
    } else {
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

    await issueTokens(res, user.id, user.email, user.role, user.tenantSlug, user.barrierxUserId);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAuth: user.isAuth,
        isEnabled: user.isEnabled,
        onboardingCompleted: user.onboardingCompleted,
        tenantSlug: user.tenantSlug,
        barrierxUserId: user.barrierxUserId,
        hubspotOwnerId: user.hubspotOwnerId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const incomingToken = req.cookies?.refresh_token;

    if (!incomingToken) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: incomingToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      if (storedToken && !storedToken.revoked) {
        // Token is expired — revoke it and all tokens for this user (possible theft)
        await prisma.refreshToken.updateMany({
          where: { userId: storedToken.userId },
          data: { revoked: true },
        });
      }
      clearAuthCookies(res);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Rotate: revoke old token, issue new pair
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const { user } = storedToken;
    await issueTokens(res, user.id, user.email, user.role, user.tenantSlug, user.barrierxUserId);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAuth: user.isAuth,
        isEnabled: user.isEnabled,
        onboardingCompleted: user.onboardingCompleted,
        tenantSlug: user.tenantSlug,
        barrierxUserId: user.barrierxUserId,
        hubspotOwnerId: user.hubspotOwnerId,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    clearAuthCookies(res);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const incomingToken = req.cookies?.refresh_token;

    if (incomingToken) {
      await prisma.refreshToken.updateMany({
        where: { token: incomingToken },
        data: { revoked: true },
      });
    }

    // Revoke all tokens for this user if authenticated
    if (req.user?.userId) {
      await prisma.refreshToken.updateMany({
        where: { userId: req.user.userId, revoked: false },
        data: { revoked: true },
      });
    }

    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out' });
  }
};

