// =====================================================
// Trades Routes
// =====================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { tradeExecutor } from '../services/trade-executor.js';
import { AppError } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Store temporal de trades (en producción usar DB)
const tradesStore = new Map<string, any[]>();

/**
 * GET /api/trades
 * Obtiene historial de trades del usuario
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const userAddress = (req as any).user?.address;
  const { page = 1, limit = 20, status } = req.query;

  const userTrades = tradesStore.get(userAddress) || [];
  
  let filteredTrades = [...userTrades];
  
  if (status) {
    filteredTrades = filteredTrades.filter(t => t.status === status);
  }

  // Ordenar por timestamp descendente
  filteredTrades.sort((a, b) => b.timestamp - a.timestamp);

  // Paginar
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const start = (pageNum - 1) * limitNum;
  const paginatedTrades = filteredTrades.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      items: paginatedTrades,
      total: filteredTrades.length,
      page: pageNum,
      pageSize: limitNum,
      hasMore: start + limitNum < filteredTrades.length,
    },
    timestamp: Date.now(),
  });
});

/**
 * GET /api/trades/:id
 * Obtiene un trade específico
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const userAddress = (req as any).user?.address;
  const { id } = req.params;

  const userTrades = tradesStore.get(userAddress) || [];
  const trade = userTrades.find(t => t.id === id);

  if (!trade) {
    throw new AppError(404, 'TRADE_NOT_FOUND', 'Trade not found');
  }

  res.json({
    success: true,
    data: trade,
    timestamp: Date.now(),
  });
});

/**
 * GET /api/trades/active
 * Obtiene trades activos/pendientes
 */
router.get('/active', authMiddleware, async (req: Request, res: Response) => {
  const activeTrades = tradeExecutor.getActiveTrades();

  res.json({
    success: true,
    data: activeTrades,
    count: activeTrades.length,
    timestamp: Date.now(),
  });
});

/**
 * POST /api/trades/:id/cancel
 * Cancela un trade pendiente
 */
router.post('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;

  const cancelled = await tradeExecutor.cancelTrade(id);

  if (!cancelled) {
    throw new AppError(400, 'CANNOT_CANCEL', 'Trade cannot be cancelled');
  }

  res.json({
    success: true,
    data: { id, cancelled: true },
    timestamp: Date.now(),
  });
});

/**
 * GET /api/trades/stats
 * Obtiene estadísticas de trading del usuario
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  const userAddress = (req as any).user?.address;
  const { period = 'ALL' } = req.query;

  const userTrades = tradesStore.get(userAddress) || [];
  
  // Filtrar por período
  let filteredTrades = [...userTrades];
  const now = Date.now();
  
  switch (period) {
    case 'DAY':
      filteredTrades = filteredTrades.filter(t => now - t.timestamp < 24 * 60 * 60 * 1000);
      break;
    case 'WEEK':
      filteredTrades = filteredTrades.filter(t => now - t.timestamp < 7 * 24 * 60 * 60 * 1000);
      break;
    case 'MONTH':
      filteredTrades = filteredTrades.filter(t => now - t.timestamp < 30 * 24 * 60 * 60 * 1000);
      break;
  }

  // Calcular estadísticas
  const confirmedTrades = filteredTrades.filter(t => t.status === 'CONFIRMED');
  const failedTrades = filteredTrades.filter(t => t.status === 'FAILED');

  const totalVolume = confirmedTrades.reduce((sum, t) => sum + t.amount, 0);
  
  // Calcular P&L (simplificado)
  let totalProfit = 0;
  let totalLoss = 0;
  
  for (const trade of confirmedTrades) {
    const pnl = (trade.executedPrice - trade.price) * trade.amount;
    if (trade.side === 'BUY') {
      if (pnl > 0) totalProfit += pnl;
      else totalLoss += Math.abs(pnl);
    } else {
      if (pnl < 0) totalProfit += Math.abs(pnl);
      else totalLoss += pnl;
    }
  }

  const stats = {
    totalTrades: filteredTrades.length,
    successfulTrades: confirmedTrades.length,
    failedTrades: failedTrades.length,
    winRate: filteredTrades.length > 0 
      ? confirmedTrades.length / filteredTrades.length 
      : 0,
    totalVolume,
    totalProfit,
    totalLoss,
    netPnL: totalProfit - totalLoss,
    averageTradeSize: filteredTrades.length > 0 
      ? totalVolume / filteredTrades.length 
      : 0,
    averageProfit: confirmedTrades.length > 0 
      ? (totalProfit - totalLoss) / confirmedTrades.length 
      : 0,
    bestTrade: confirmedTrades.length > 0 
      ? Math.max(...confirmedTrades.map(t => (t.executedPrice - t.price) * t.amount)) 
      : 0,
    worstTrade: confirmedTrades.length > 0 
      ? Math.min(...confirmedTrades.map(t => (t.executedPrice - t.price) * t.amount)) 
      : 0,
    period,
  };

  res.json({
    success: true,
    data: stats,
    timestamp: Date.now(),
  });
});

export { router as tradesRouter };
