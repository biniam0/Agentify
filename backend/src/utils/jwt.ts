import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
};

export const generateRefreshTokenValue = (): string => {
  return crypto.randomBytes(48).toString('base64url');
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};

/** @deprecated Use generateAccessToken instead. Kept for backward compat during migration. */
export const generateToken = generateAccessToken;

export const ACCESS_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;   // 7 days
export const REFRESH_TOKEN_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days

