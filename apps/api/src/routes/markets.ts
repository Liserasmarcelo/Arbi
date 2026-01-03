// =====================================================
// Markets Routes
// =====================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PolymarketClient } from '@polyarbitrage/polymarket-client';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';

const router = Router();
const client = new PolymarketClient({ baseUrl: config.polymarket.clobApi });

// Cache simple en memoria (en producción usar Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 segundos

/**
 * GET /api/markets
 * Obtiene lista de mercados activos
 */
router.get('/', async (req: Request, res: Response) => {
  const cacheKey = 'markets:all';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({
      success: true,
      data: cached.data,
      cached: true,
      timestamp: Date.now(),
    });
  }
  
  try {
    const markets = await client.getMarkets();
    
    // Filtrar y transformar
    const activeMarkets = markets
      .filter(m => m.active && !m.closed)
      .map(m => client.marketToInternal(m));
    
    // Guardar en cache
    cache.set(cacheKey, { data: activeMarkets, timestamp: Date.now() });
    
    res.json({
      success: true,
      data: activeMarkets,
      count: activeMarkets.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Failed to fetch markets', error);
    throw new AppError(502, 'POLYMARKET_ERROR', 'Failed to fetch markets from Polymarket');
  }
});

/**
 * GET /api/markets/:id
 * Obtiene un mercado específico
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const cacheKey = `markets:${id}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({
      success: true,
      data: cached.data,
      cached: true,
      timestamp: Date.now(),
    });
  }
  
  try {
    const market = await client.getMarket(id);
    const internalMarket = client.marketToInternal(market);
    
    // Obtener precios actuales
    const prices = await client.getMarketPrices(market);
    
    const result = {
      ...internalMarket,
      prices,
    };
    
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error(`Failed to fetch market ${id}`, error);
    throw new AppError(404, 'MARKET_NOT_FOUND', 'Market not found');
  }
});

/**
 * GET /api/markets/:id/orderbook
 * Obtiene el orderbook de un mercado
 */
router.get('/:id/orderbook', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { outcome } = req.query;
  
  try {
    const market = await client.getMarket(id);
    const token = market.tokens.find(t => 
      t.outcome.toUpperCase() === (outcome as string)?.toUpperCase() || 
      (!outcome && t.outcome === 'Yes')
    );
    
    if (!token) {
      throw new AppError(400, 'INVALID_OUTCOME', 'Invalid outcome specified');
    }
    
    const orderbook = await client.getOrderBook(token.token_id);
    
    res.json({
      success: true,
      data: {
        tokenId: token.token_id,
        outcome: token.outcome,
        bids: orderbook.bids.map(b => ({
          price: parseFloat(b.price),
          size: parseFloat(b.size),
        })),
        asks: orderbook.asks.map(a => ({
          price: parseFloat(a.price),
          size: parseFloat(a.size),
        })),
        timestamp: orderbook.timestamp,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`Failed to fetch orderbook for ${id}`, error);
    throw new AppError(502, 'ORDERBOOK_ERROR', 'Failed to fetch orderbook');
  }
});

/**
 * GET /api/markets/:id/prices
 * Obtiene precios de un mercado
 */
router.get('/:id/prices', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const market = await client.getMarket(id);
    const prices = await client.getMarketPrices(market);
    
    res.json({
      success: true,
      data: prices,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error(`Failed to fetch prices for ${id}`, error);
    throw new AppError(502, 'PRICES_ERROR', 'Failed to fetch prices');
  }
});

/**
 * GET /api/markets/search
 * Busca mercados por texto
 */
router.get('/search', async (req: Request, res: Response) => {
  const { q, limit = 20 } = req.query;
  
  if (!q || typeof q !== 'string') {
    throw new AppError(400, 'MISSING_QUERY', 'Search query is required');
  }
  
  try {
    const markets = await client.getMarkets();
    const query = q.toLowerCase();
    
    const results = markets
      .filter(m => 
        m.active && 
        !m.closed && 
        m.question.toLowerCase().includes(query)
      )
      .slice(0, Number(limit))
      .map(m => client.marketToInternal(m));
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Failed to search markets', error);
    throw new AppError(502, 'SEARCH_ERROR', 'Failed to search markets');
  }
});

export { router as marketsRouter };
