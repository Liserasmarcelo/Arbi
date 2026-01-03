// =====================================================
// Bot Configuration
// =====================================================

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  webAppUrl: process.env.TELEGRAM_WEBAPP_URL || 'https://app.polyarbitrage.com',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  
  // Polymarket
  polymarket: {
    clobApi: process.env.POLYMARKET_CLOB_API || 'https://clob.polymarket.com',
    wsUrl: process.env.POLYMARKET_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  },
  
  // Arbitrage
  arbitrage: {
    minProfitPercentage: parseFloat(process.env.MIN_ARBITRAGE_THRESHOLD || '0.5'),
    scanIntervalMs: parseInt(process.env.SCAN_INTERVAL_MS || '5000', 10),
    maxOpportunitiesPerMessage: 5,
  },
  
  // Redis (para almacenar suscriptores)
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validar configuración requerida
if (!config.telegramBotToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}
