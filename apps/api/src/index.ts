// =====================================================
// PolyArbitrage API Server
// =====================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.js';
import { marketsRouter } from './routes/markets.js';
import { arbitrageRouter } from './routes/arbitrage.js';
import { tradesRouter } from './routes/trades.js';
import { userRouter } from './routes/user.js';
import { websocketServer } from './websocket/index.js';
import { ArbitrageScanner } from './services/arbitrage-scanner.js';
import { logger } from './utils/logger.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.version,
  });
});

// Metrics (para Prometheus)
app.get('/metrics', (req, res) => {
  // En producción, usar prom-client
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    activeConnections: websocketServer.getConnectionCount(),
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/markets', marketsRouter);
app.use('/api/arbitrage', arbitrageRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/user', userRouter);

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 API server running on port ${config.port}`);
  logger.info(`📊 Environment: ${config.environment}`);
});

// Initialize WebSocket server
websocketServer.initialize(server);

// Initialize Arbitrage Scanner
const scanner = new ArbitrageScanner();
scanner.start().catch((error) => {
  logger.error('Failed to start arbitrage scanner:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await scanner.stop();
  websocketServer.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, server };
