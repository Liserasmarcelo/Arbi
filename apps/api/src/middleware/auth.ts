// =====================================================
// Auth Middleware
// =====================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './error-handler.js';

interface JWTPayload {
  address?: string;
  telegramId?: number;
  username?: string;
  type: 'wallet' | 'telegram';
  iat: number;
  exp: number;
}

/**
 * Middleware de autenticación
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'NO_TOKEN', 'Authentication token required');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    // Adjuntar usuario a la request
    (req as any).user = {
      address: decoded.address,
      telegramId: decoded.telegramId,
      username: decoded.username,
      type: decoded.type,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid token');
    }
    throw new AppError(401, 'AUTH_ERROR', 'Authentication failed');
  }
}

/**
 * Middleware opcional de autenticación
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    (req as any).user = {
      address: decoded.address,
      telegramId: decoded.telegramId,
      username: decoded.username,
      type: decoded.type,
    };
  } catch (error) {
    // Ignorar errores de token en auth opcional
  }

  next();
}

/**
 * Middleware para requerir wallet conectada
 */
export function requireWallet(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user;

  if (!user || !user.address) {
    throw new AppError(401, 'WALLET_REQUIRED', 'Wallet connection required');
  }

  next();
}
