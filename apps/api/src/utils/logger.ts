// =====================================================
// Logger Utility
// =====================================================

import { config } from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[config.logLevel as LogLevel] || LOG_LEVELS.info;

function formatMessage(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: any): void {
    if (LOG_LEVELS.debug >= currentLevel) {
      console.debug(formatMessage('debug', message, meta));
    }
  },

  info(message: string, meta?: any): void {
    if (LOG_LEVELS.info >= currentLevel) {
      console.info(formatMessage('info', message, meta));
    }
  },

  warn(message: string, meta?: any): void {
    if (LOG_LEVELS.warn >= currentLevel) {
      console.warn(formatMessage('warn', message, meta));
    }
  },

  error(message: string, error?: any): void {
    if (LOG_LEVELS.error >= currentLevel) {
      const meta = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(formatMessage('error', message, meta));
    }
  },
};
