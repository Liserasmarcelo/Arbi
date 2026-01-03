// =====================================================
// Logger Utility
// =====================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function formatMessage(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [BOT] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: any): void {
    console.debug(formatMessage('debug', message, meta));
  },

  info(message: string, meta?: any): void {
    console.info(formatMessage('info', message, meta));
  },

  warn(message: string, meta?: any): void {
    console.warn(formatMessage('warn', message, meta));
  },

  error(message: string, error?: any): void {
    const meta = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    console.error(formatMessage('error', message, meta));
  },
};
