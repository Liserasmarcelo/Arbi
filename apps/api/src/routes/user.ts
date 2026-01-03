// =====================================================
// User Routes
// =====================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';
import { validateArbitrageConfig, validateRiskLimits } from '@polyarbitrage/utils';

const router = Router();

// Store temporal de usuarios (en producción usar DB)
const usersStore = new Map<string, any>();

// Schema de settings
const settingsSchema = z.object({
  notifications: z.object({
    enabled: z.boolean().optional(),
    minProfitAlert: z.number().min(0.1).max(50).optional(),
    tradeExecuted: z.boolean().optional(),
    tradeFailed: z.boolean().optional(),
    dailySummary: z.boolean().optional(),
  }).optional(),
  trading: z.object({
    autoExecute: z.boolean().optional(),
    maxPositionSize: z.number().min(1).max(10000).optional(),
    minProfitPercentage: z.number().min(0.1).max(50).optional(),
    maxDailyLoss: z.number().min(1).max(1000).optional(),
    maxConcurrentTrades: z.number().min(1).max(10).optional(),
    slippageTolerance: z.number().min(0.001).max(0.1).optional(),
  }).optional(),
  display: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.enum(['es', 'en']).optional(),
    currency: z.enum(['USD', 'EUR']).optional(),
  }).optional(),
});

/**
 * GET /api/user/profile
 * Obtiene perfil del usuario
 */
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  // Obtener o crear perfil
  let profile = usersStore.get(user.address || user.telegramId);
  
  if (!profile) {
    profile = createDefaultProfile(user);
    usersStore.set(user.address || user.telegramId, profile);
  }

  res.json({
    success: true,
    data: profile,
    timestamp: Date.now(),
  });
});

/**
 * PUT /api/user/settings
 * Actualiza configuración del usuario
 */
router.put('/settings', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const newSettings = settingsSchema.parse(req.body);

  const userId = user.address || user.telegramId;
  let profile = usersStore.get(userId);

  if (!profile) {
    profile = createDefaultProfile(user);
  }

  // Validar configuración de trading
  if (newSettings.trading) {
    const validation = validateArbitrageConfig({
      minProfitPercentage: newSettings.trading.minProfitPercentage,
      maxPositionSizeUsd: newSettings.trading.maxPositionSize,
      slippageTolerance: newSettings.trading.slippageTolerance,
    });

    if (!validation.valid) {
      throw new AppError(400, 'INVALID_CONFIG', validation.errors.join(', '));
    }
  }

  // Merge settings
  profile.settings = {
    notifications: { ...profile.settings.notifications, ...newSettings.notifications },
    trading: { ...profile.settings.trading, ...newSettings.trading },
    display: { ...profile.settings.display, ...newSettings.display },
  };
  profile.updatedAt = new Date();

  usersStore.set(userId, profile);

  logger.info(`User settings updated: ${userId}`);

  res.json({
    success: true,
    data: profile.settings,
    timestamp: Date.now(),
  });
});

/**
 * POST /api/user/wallet
 * Vincula wallet al usuario de Telegram
 */
router.post('/wallet', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { walletAddress, signature } = req.body;

  if (!walletAddress) {
    throw new AppError(400, 'WALLET_REQUIRED', 'Wallet address is required');
  }

  // En producción, verificar la firma
  const userId = user.telegramId;
  
  if (!userId) {
    throw new AppError(400, 'TELEGRAM_AUTH_REQUIRED', 'Telegram authentication required');
  }

  let profile = usersStore.get(userId);

  if (!profile) {
    profile = createDefaultProfile(user);
  }

  profile.walletAddress = walletAddress.toLowerCase();
  profile.updatedAt = new Date();

  usersStore.set(userId, profile);

  logger.info(`Wallet linked for user ${userId}: ${walletAddress}`);

  res.json({
    success: true,
    data: {
      walletAddress: profile.walletAddress,
    },
    timestamp: Date.now(),
  });
});

/**
 * DELETE /api/user/wallet
 * Desvincula wallet del usuario
 */
router.delete('/wallet', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = user.telegramId || user.address;

  const profile = usersStore.get(userId);

  if (profile) {
    profile.walletAddress = null;
    profile.updatedAt = new Date();
    usersStore.set(userId, profile);
  }

  res.json({
    success: true,
    data: { walletAddress: null },
    timestamp: Date.now(),
  });
});

/**
 * GET /api/user/risk
 * Obtiene métricas de riesgo del usuario
 */
router.get('/risk', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = user.address || user.telegramId;

  // En producción, calcular desde trades reales
  const riskMetrics = {
    userId,
    dailyPnL: 12.45,
    weeklyPnL: 45.32,
    monthlyPnL: 156.78,
    totalTrades: 42,
    winRate: 0.75,
    averageProfit: 3.12,
    maxDrawdown: 15.50,
    riskScore: 35, // 0-100, menor es mejor
    lastUpdated: Date.now(),
  };

  res.json({
    success: true,
    data: riskMetrics,
    timestamp: Date.now(),
  });
});

/**
 * Crea perfil por defecto
 */
function createDefaultProfile(user: any) {
  return {
    id: user.address || user.telegramId,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    walletAddress: user.address,
    settings: {
      notifications: {
        enabled: true,
        minProfitAlert: 1.0,
        tradeExecuted: true,
        tradeFailed: true,
        dailySummary: false,
      },
      trading: {
        autoExecute: false,
        maxPositionSize: 100,
        minProfitPercentage: 0.5,
        maxDailyLoss: 100,
        maxConcurrentTrades: 3,
        slippageTolerance: 0.01,
      },
      display: {
        theme: 'dark',
        language: 'es',
        currency: 'USD',
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export { router as userRouter };
