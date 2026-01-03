// =====================================================
// Auth Routes
// =====================================================

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { z } from 'zod';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error-handler.js';
import { generateNonce, generateSignMessage, verifySignature } from '@polyarbitrage/utils';
import { logger } from '../utils/logger.js';

const router = Router();

// Store temporal de nonces (en producción usar Redis)
const nonceStore = new Map<string, { nonce: string; timestamp: number }>();

// Schemas de validación
const getNonceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const verifySignatureSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string(),
  nonce: z.string(),
});

const verifyTelegramSchema = z.object({
  initData: z.string(),
});

/**
 * GET /api/auth/nonce
 * Obtiene un nonce para firmar
 */
router.get('/nonce', async (req: Request, res: Response) => {
  const { address } = getNonceSchema.parse(req.query);
  
  const nonce = generateNonce();
  const timestamp = Date.now();
  
  // Guardar nonce
  nonceStore.set(address.toLowerCase(), { nonce, timestamp });
  
  // Limpiar nonces expirados
  const expirationTime = 5 * 60 * 1000; // 5 minutos
  for (const [key, value] of nonceStore) {
    if (Date.now() - value.timestamp > expirationTime) {
      nonceStore.delete(key);
    }
  }
  
  res.json({
    success: true,
    data: {
      nonce,
      message: generateSignMessage(nonce, 'login', timestamp),
      expiresAt: timestamp + expirationTime,
    },
    timestamp: Date.now(),
  });
});

/**
 * POST /api/auth/verify
 * Verifica la firma y genera JWT
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { address, signature, nonce } = verifySignatureSchema.parse(req.body);
  
  const addressLower = address.toLowerCase();
  const storedData = nonceStore.get(addressLower);
  
  if (!storedData) {
    throw new AppError(400, 'NONCE_NOT_FOUND', 'Nonce not found or expired');
  }
  
  if (storedData.nonce !== nonce) {
    throw new AppError(400, 'INVALID_NONCE', 'Invalid nonce');
  }
  
  // Verificar que no haya expirado
  const expirationTime = 5 * 60 * 1000;
  if (Date.now() - storedData.timestamp > expirationTime) {
    nonceStore.delete(addressLower);
    throw new AppError(400, 'NONCE_EXPIRED', 'Nonce has expired');
  }
  
  // Verificar firma
  const message = generateSignMessage(nonce, 'login', storedData.timestamp);
  const isValid = verifySignature(message, signature, address);
  
  if (!isValid) {
    throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid signature');
  }
  
  // Eliminar nonce usado
  nonceStore.delete(addressLower);
  
  // Generar JWT
  const token = jwt.sign(
    { 
      address: addressLower,
      type: 'wallet',
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  
  logger.info(`User authenticated: ${addressLower}`);
  
  res.json({
    success: true,
    data: {
      token,
      address: addressLower,
      expiresIn: config.jwtExpiresIn,
    },
    timestamp: Date.now(),
  });
});

/**
 * POST /api/auth/telegram
 * Verifica datos de Telegram WebApp
 */
router.post('/telegram', async (req: Request, res: Response) => {
  const { initData } = verifyTelegramSchema.parse(req.body);
  
  // Verificar initData de Telegram
  // En producción, validar el hash con HMAC usando el bot token
  
  try {
    const urlParams = new URLSearchParams(initData);
    const userDataStr = urlParams.get('user');
    const hash = urlParams.get('hash');
    const authDate = urlParams.get('auth_date');
    
    if (!userDataStr || !hash || !authDate) {
      throw new AppError(400, 'INVALID_INIT_DATA', 'Missing required Telegram data');
    }
    
    const userData = JSON.parse(userDataStr);
    
    // TODO: Verificar hash con bot token en producción
    // const isValid = validateTelegramInitData(initData, config.telegramBotToken);
    
    // Generar JWT
    const token = jwt.sign(
      {
        telegramId: userData.id,
        username: userData.username,
        type: 'telegram',
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    logger.info(`Telegram user authenticated: ${userData.id}`);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          telegramId: userData.id,
          username: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
        },
        expiresIn: config.jwtExpiresIn,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'INVALID_TELEGRAM_DATA', 'Failed to parse Telegram data');
  }
});

/**
 * POST /api/auth/refresh
 * Renueva el token JWT
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'NO_TOKEN', 'No token provided');
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      ignoreExpiration: true,
    }) as any;
    
    // Verificar que no sea muy viejo (máximo 7 días)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    if (tokenAge > 7 * 24 * 60 * 60) {
      throw new AppError(401, 'TOKEN_TOO_OLD', 'Token is too old to refresh');
    }
    
    // Generar nuevo token
    const newToken = jwt.sign(
      {
        address: decoded.address,
        telegramId: decoded.telegramId,
        type: decoded.type,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    res.json({
      success: true,
      data: {
        token: newToken,
        expiresIn: config.jwtExpiresIn,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
});

export { router as authRouter };
