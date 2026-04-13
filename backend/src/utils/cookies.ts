import { Response } from 'express';
import { config } from '../config/env';
import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from './jwt';

const isProduction = config.nodeEnv === 'production';

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  });

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
  });
};
