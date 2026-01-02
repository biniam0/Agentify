/**
 * Service Authentication Middleware
 * 
 * Authenticates external services using API keys
 * Phase 1: Core authentication logic
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';

export interface ServiceAuthRequest extends Request {
    service?: {
        id: string;
        name: string;
        scopes: string[];
    };
}

/**
 * Middleware to authenticate service API keys
 */
export const authenticateService = async (
    req: ServiceAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'API key required in X-API-Key header'
            });
            return;
        }

        // Hash the API key for secure comparison
        const hashedKey = crypto
            .createHash('sha256')
            .update(apiKey)
            .digest('hex');

        // Lookup API key in database
        const serviceKey = await prisma.serviceApiKey.findUnique({
            where: { keyHash: hashedKey },
            include: { service: true }
        });

        // Validate key exists and is active
        if (!serviceKey || !serviceKey.isActive || !serviceKey.service.isActive) {
            console.log(`⚠️  Invalid or inactive API key attempt`);
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or inactive API key'
            });
            return;
        }

        // Check expiration
        if (serviceKey.expiresAt && serviceKey.expiresAt < new Date()) {
            console.log(`⚠️  Expired API key used: ${serviceKey.keyPrefix}`);
            res.status(401).json({
                error: 'Unauthorized',
                message: 'API key has expired'
            });
            return;
        }

        // Update last used timestamp (async, don't wait)
        prisma.serviceApiKey.update({
            where: { id: serviceKey.id },
            data: { lastUsedAt: new Date() }
        }).catch(err => console.error('Failed to update lastUsedAt:', err));

        // Attach service info to request
        req.service = {
            id: serviceKey.service.id,
            name: serviceKey.service.name,
            scopes: serviceKey.scopes,
        };

        console.log(`✅ Service authenticated: ${serviceKey.service.name}`);
        next();
    } catch (error) {
        console.error('❌ Service auth middleware error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to authenticate service'
        });
    }
};

/**
 * Middleware to check if service has required scope
 */
export const requireScope = (requiredScope: string) => {
    return (req: ServiceAuthRequest, res: Response, next: NextFunction): void => {
        if (!req.service) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Service not authenticated'
            });
            return;
        }

        const hasScope = req.service.scopes.includes(requiredScope) ||
            req.service.scopes.includes('*');

        if (!hasScope) {
            console.log(`⚠️  Missing scope: ${requiredScope} for service: ${req.service.name}`);
            res.status(403).json({
                error: 'Forbidden',
                message: `Missing required scope: ${requiredScope}`,
                requiredScope,
                yourScopes: req.service.scopes
            });
            return;
        }

        next();
    };
};

