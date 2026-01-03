// =====================================================
// Arbitrage Routes
// =====================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ArbitrageScanner } from '../services/arbitrage-scanner.js';
import { tradeExecutor } from '../services/trade-executor.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Scanner singleton (se inicializa en index.ts)
let scanner: ArbitrageScanner | null = null;

export function setScanner(s: ArbitrageScanner): void {
  scanner = s;
}

// Schemas
const executeSchema = z.object({
  opportunityId: z.string(),
  investmentUsd: z.number().min(1).max(1000),
});

const configSchema = z.object({
  minProfitPercentage: z.number().min(0.1).max(50).optional(),
  maxPositionSizeUsd: z.number().min(1).max(10000).optional(),
  slippageTolerance: z.number().min(0.001).max(0.1).optional(),
});

/**
 * GET /api/arbitrage/opportunities
 * Obtiene oportunidades actuales de arbitraje
 */
router.get('/opportunities', async (req: Request, res: Response) => {
  if (!scanner) {
    throw new AppError(503, 'SCANNER_NOT_READY', 'Arbitrage scanner not initialized');
  }

  const opportunities = scanner.getOpportunities();

  res.json({
    success: true,
    data: opportunities,
    count: opportunities.length,
    timestamp: Date.now(),
  });
});

/**
 * GET /api/arbitrage/opportunities/:id
 * Obtiene una oportunidad específica
 */
router.get('/opportunities/:id', async (req: Request, res: Response) => {
  if (!scanner) {
    throw new AppError(503, 'SCANNER_NOT_READY', 'Arbitrage scanner not initialized');
  }

  const { id } = req.params;
  const opportunity = scanner.getOpportunity(id);

  if (!opportunity) {
    throw new AppError(404, 'OPPORTUNITY_NOT_FOUND', 'Opportunity not found or expired');
  }

  res.json({
    success: true,
    data: opportunity,
    timestamp: Date.now(),
  });
});

/**
 * POST /api/arbitrage/execute
 * Ejecuta una operación de arbitraje
 */
router.post('/execute', authMiddleware, async (req: Request, res: Response) => {
  if (!scanner) {
    throw new AppError(503, 'SCANNER_NOT_READY', 'Arbitrage scanner not initialized');
  }

  const { opportunityId, investmentUsd } = executeSchema.parse(req.body);
  const userAddress = (req as any).user?.address;

  if (!userAddress) {
    throw new AppError(401, 'WALLET_REQUIRED', 'Wallet connection required to execute trades');
  }

  // Verificar oportunidad
  const opportunity = scanner.getOpportunity(opportunityId);
  if (!opportunity) {
    throw new AppError(404, 'OPPORTUNITY_NOT_FOUND', 'Opportunity not found or expired');
  }

  // Verificar límites
  if (investmentUsd > config.arbitrage.maxPositionSizeUsd) {
    throw new AppError(400, 'EXCEEDS_MAX_POSITION', 
      `Maximum position size is $${config.arbitrage.maxPositionSizeUsd}`);
  }

  logger.info(`Executing arbitrage for user ${userAddress}`, {
    opportunityId,
    investmentUsd,
  });

  // En producción, necesitaríamos el signer del usuario
  // Por ahora, simulamos la ejecución
  const result = await tradeExecutor.executeArbitrage({
    opportunity,
    userAddress,
    investmentUsd,
    signer: null as any, // En prod: obtener signer del usuario
  });

  if (!result.success) {
    throw new AppError(400, 'EXECUTION_FAILED', result.error || 'Trade execution failed');
  }

  res.json({
    success: true,
    data: result,
    timestamp: Date.now(),
  });
});

/**
 * GET /api/arbitrage/status
 * Estado del scanner de arbitraje
 */
router.get('/status', async (req: Request, res: Response) => {
  if (!scanner) {
    return res.json({
      success: true,
      data: {
        isRunning: false,
        marketsCount: 0,
        opportunitiesCount: 0,
        config: config.arbitrage,
      },
      timestamp: Date.now(),
    });
  }

  res.json({
    success: true,
    data: scanner.getStatus(),
    timestamp: Date.now(),
  });
});

/**
 * PUT /api/arbitrage/config
 * Actualiza configuración del scanner (admin)
 */
router.put('/config', authMiddleware, async (req: Request, res: Response) => {
  // TODO: Verificar que es admin
  
  if (!scanner) {
    throw new AppError(503, 'SCANNER_NOT_READY', 'Arbitrage scanner not initialized');
  }

  const newConfig = configSchema.parse(req.body);
  scanner.updateConfig(newConfig);

  res.json({
    success: true,
    data: scanner.getStatus().config,
    timestamp: Date.now(),
  });
});

/**
 * GET /api/arbitrage/simulate
 * Simula una operación de arbitraje
 */
router.get('/simulate', async (req: Request, res: Response) => {
  const { yesPrice, noPrice, investment = 100 } = req.query;

  if (!yesPrice || !noPrice) {
    throw new AppError(400, 'MISSING_PARAMS', 'yesPrice and noPrice are required');
  }

  const yes = parseFloat(yesPrice as string);
  const no = parseFloat(noPrice as string);
  const inv = parseFloat(investment as string);

  if (yes <= 0 || yes >= 1 || no <= 0 || no >= 1) {
    throw new AppError(400, 'INVALID_PRICES', 'Prices must be between 0 and 1');
  }

  const totalPrice = yes + no;
  const hasOpportunity = totalPrice < 0.995 || totalPrice > 1.005;
  
  const profitPercentage = hasOpportunity
    ? Math.abs(1 - totalPrice) * 100
    : 0;

  const grossProfit = inv * Math.abs(1 - totalPrice);
  const estimatedGas = 0.05; // $0.05 estimado
  const netProfit = grossProfit - estimatedGas;

  res.json({
    success: true,
    data: {
      yesPrice: yes,
      noPrice: no,
      totalPrice,
      hasOpportunity,
      type: totalPrice < 1 ? 'BUY_BOTH' : 'SELL_BOTH',
      investment: inv,
      profitPercentage,
      grossProfit,
      estimatedGasCost: estimatedGas,
      netProfit,
      profitable: netProfit > 0,
    },
    timestamp: Date.now(),
  });
});

export { router as arbitrageRouter };
