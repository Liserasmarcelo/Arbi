// =====================================================
// Configuración del API
// =====================================================

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.API_PORT || '3001', 10),
  environment: process.env.NODE_ENV || 'development',
  version: '1.0.0',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://app.polyarbitrage.com',
  ],
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/polyarbitrage',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  jwtExpiresIn: '24h',
  
  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramWebAppUrl: process.env.TELEGRAM_WEBAPP_URL || 'https://app.polyarbitrage.com',
  
  // Polymarket
  polymarket: {
    clobApi: process.env.POLYMARKET_CLOB_API || 'https://clob.polymarket.com',
    gammaApi: process.env.POLYMARKET_GAMMA_API || 'https://gamma-api.polymarket.com',
    wsUrl: process.env.POLYMARKET_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  },
  
  // Blockchain
  blockchain: {
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    chainId: parseInt(process.env.CHAIN_ID || '137', 10),
  },
  
  // Arbitrage settings
  arbitrage: {
    minProfitPercentage: parseFloat(process.env.MIN_ARBITRAGE_THRESHOLD || '0.5'),
    maxPositionSizeUsd: parseFloat(process.env.MAX_POSITION_SIZE_USD || '100'),
    slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.01'),
    maxGasPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI || '50', 10),
    scanIntervalMs: parseInt(process.env.SCAN_INTERVAL_MS || '1000', 10),
    maxConcurrentTrades: parseInt(process.env.MAX_CONCURRENT_TRADES || '3', 10),
  },
  
  // Risk management
  risk: {
    maxDailyLossUsd: parseFloat(process.env.DAILY_LOSS_LIMIT_USD || '100'),
    cooldownAfterLossMinutes: parseInt(process.env.LOSS_COOLDOWN_MINUTES || '10', 10),
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export type Config = typeof config;
