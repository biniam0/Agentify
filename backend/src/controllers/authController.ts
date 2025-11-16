import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import * as barrierxService from '../services/barrierxService';
import { generateToken } from '../utils/jwt';

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
    
    // Get full user details from BarrierX
    const barrierxUser = await barrierxService.getUserById(barrierxLoginResponse.userId);
    
    if (!barrierxUser) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    // Try to find user by ID first, then by email
    let user = await prisma.user.findUnique({
      where: { id: barrierxUser.id },
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
          isAuth: barrierxUser.isAuth,
          isEnabled: barrierxUser.isEnabled,
        },
      });
    } else {
      // User doesn't exist - create new user
      user = await prisma.user.create({
        data: {
          id: barrierxUser.id,
          name: barrierxUser.name,
          email: barrierxUser.email,
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

