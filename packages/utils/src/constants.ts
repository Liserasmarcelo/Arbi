// =====================================================
// Constantes Globales
// =====================================================

// =====================================================
// REDES BLOCKCHAIN
// =====================================================

export const NETWORKS = {
  POLYGON_MAINNET: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  POLYGON_MUMBAI: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
} as const;

// =====================================================
// TOKENS
// =====================================================

export const TOKENS = {
  USDC: {
    POLYGON: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    MUMBAI: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
    decimals: 6,
    symbol: 'USDC',
  },
  MATIC: {
    address: '0x0000000000000000000000000000000000001010',
    decimals: 18,
    symbol: 'MATIC',
  },
} as const;

// =====================================================
// POLYMARKET
// =====================================================

export const POLYMARKET = {
  CLOB_API: 'https://clob.polymarket.com',
  GAMMA_API: 'https://gamma-api.polymarket.com',
  WS_URL: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  CONDITIONAL_TOKENS_FRAMEWORK: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
  EXCHANGE_PROXY: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
} as const;

// =====================================================
// ARBITRAJE
// =====================================================

export const ARBITRAGE_DEFAULTS = {
  MIN_PROFIT_PERCENTAGE: 0.5, // 0.5%
  MAX_POSITION_SIZE_USD: 100,
  SLIPPAGE_TOLERANCE: 0.01, // 1%
  MAX_GAS_PRICE_GWEI: 50,
  MIN_LIQUIDITY_USD: 100,
  OPPORTUNITY_EXPIRY_MS: 30000, // 30 segundos
  SCAN_INTERVAL_MS: 1000, // 1 segundo
} as const;

// =====================================================
// RIESGO
// =====================================================

export const RISK_DEFAULTS = {
  MAX_DAILY_LOSS_USD: 100,
  MAX_CONCURRENT_TRADES: 3,
  COOLDOWN_AFTER_LOSS_MINUTES: 10,
  MIN_TRADE_SIZE_USD: 5,
  MAX_TRADE_SIZE_USD: 100,
} as const;

// =====================================================
// TELEGRAM
// =====================================================

export const TELEGRAM = {
  BOT_NAME: 'PolyArbitrageBot',
  WEBAPP_URL: 'https://app.polyarbitrage.com',
  MAX_MESSAGE_LENGTH: 4096,
  INLINE_KEYBOARD_MAX_BUTTONS: 8,
} as const;

// =====================================================
// TIMEOUTS Y LÍMITES
// =====================================================

export const TIMEOUTS = {
  API_REQUEST_MS: 10000,
  WS_PING_INTERVAL_MS: 30000,
  SESSION_EXPIRY_MS: 1800000, // 30 minutos
  NONCE_EXPIRY_MS: 300000, // 5 minutos
  ORDER_TIMEOUT_MS: 60000, // 1 minuto
} as const;

// =====================================================
// MENSAJES DE ERROR
// =====================================================

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Wallet no conectada. Usa /wallet para conectar.',
  INSUFFICIENT_BALANCE: 'Balance insuficiente para realizar la operación.',
  TRADE_FAILED: 'La operación ha fallado. Por favor, inténtalo de nuevo.',
  SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
  RATE_LIMITED: 'Demasiadas solicitudes. Por favor, espera un momento.',
  MARKET_CLOSED: 'Este mercado está cerrado.',
  INVALID_AMOUNT: 'Cantidad inválida.',
  RISK_LIMIT_EXCEEDED: 'Has alcanzado tu límite de riesgo diario.',
  UNAUTHORIZED: 'No tienes autorización para esta acción.',
  INTERNAL_ERROR: 'Error interno. Por favor, contacta soporte.',
} as const;

// =====================================================
// MENSAJES DE ÉXITO
// =====================================================

export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: '✅ Wallet conectada correctamente.',
  WALLET_DISCONNECTED: '✅ Wallet desconectada.',
  TRADE_SUBMITTED: '📤 Operación enviada.',
  TRADE_CONFIRMED: '✅ Operación confirmada.',
  SETTINGS_UPDATED: '✅ Configuración actualizada.',
} as const;

// =====================================================
// EMOJIS
// =====================================================

export const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  MONEY: '💰',
  CHART_UP: '📈',
  CHART_DOWN: '📉',
  ROBOT: '🤖',
  BELL: '🔔',
  SETTINGS: '⚙️',
  WALLET: '👛',
  LOCK: '🔒',
  TIME: '⏱️',
  FIRE: '🔥',
  STAR: '⭐',
  CHECK: '☑️',
  CROSS: '✖️',
  ARROW_RIGHT: '➡️',
  REFRESH: '🔄',
} as const;

// =====================================================
// JURISDICCIONES RESTRINGIDAS
// =====================================================

export const RESTRICTED_JURISDICTIONS = [
  'US', // Estados Unidos
  'CA', // Canadá  
  'CN', // China
  'IR', // Irán
  'KP', // Corea del Norte
  'SY', // Siria
  'CU', // Cuba
] as const;
