// =====================================================
// PolyArbitrage Bot - Tipos Compartidos
// =====================================================

// =====================================================
// MERCADOS Y PRECIOS
// =====================================================

export interface Market {
  id: string;
  question: string;
  slug: string;
  conditionId: string;
  active: boolean;
  closed: boolean;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  volume: string;
  liquidity: string;
  outcomes: Outcome[];
}

export interface Outcome {
  id: string;
  name: string;
  price: number;
  token: Token;
}

export interface Token {
  id: string;
  tokenId: string;
  outcome: 'YES' | 'NO';
}

export interface OrderBook {
  marketId: string;
  timestamp: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface OrderBookEntry {
  price: number;
  size: number;
}

export interface PriceData {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  yesBestBid: number;
  yesBestAsk: number;
  noBestBid: number;
  noBestAsk: number;
  timestamp: number;
}

// =====================================================
// ARBITRAJE
// =====================================================

export interface ArbitrageOpportunity {
  id: string;
  marketId: string;
  marketQuestion: string;
  type: ArbitrageType;
  yesPrice: number;
  noPrice: number;
  totalPrice: number;
  profitPercentage: number;
  profitAbsolute: number;
  maxInvestment: number;
  estimatedProfit: number;
  timestamp: number;
  expiresAt: number;
  confidence: ArbitrageConfidence;
}

export type ArbitrageType = 'BUY_BOTH' | 'SELL_BOTH';

export type ArbitrageConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ArbitrageConfig {
  minProfitPercentage: number;
  maxPositionSizeUsd: number;
  slippageTolerance: number;
  maxGasPriceGwei: number;
  minLiquidity: number;
  maxTradesConcurrent: number;
}

export interface ArbitrageResult {
  opportunityId: string;
  success: boolean;
  trades: TradeExecution[];
  totalInvested: number;
  expectedProfit: number;
  actualProfit?: number;
  gasUsed: number;
  gasCost: number;
  error?: string;
  timestamp: number;
}

// =====================================================
// TRADING
// =====================================================

export interface TradeExecution {
  id: string;
  marketId: string;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  amount: number;
  price: number;
  executedPrice: number;
  slippage: number;
  status: TradeStatus;
  txHash?: string;
  gasUsed?: number;
  timestamp: number;
  error?: string;
}

export type TradeStatus = 
  | 'PENDING' 
  | 'SUBMITTED' 
  | 'CONFIRMED' 
  | 'FAILED' 
  | 'CANCELLED';

export interface Order {
  id: string;
  marketId: string;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  price: number;
  size: number;
  type: 'LIMIT' | 'MARKET';
  status: OrderStatus;
  filledSize: number;
  remainingSize: number;
  createdAt: number;
  updatedAt: number;
}

export type OrderStatus = 
  | 'OPEN' 
  | 'PARTIALLY_FILLED' 
  | 'FILLED' 
  | 'CANCELLED' 
  | 'EXPIRED';

// =====================================================
// WALLET
// =====================================================

export interface WalletInfo {
  address: string;
  chainId: number;
  balances: TokenBalance[];
  connected: boolean;
  connectedAt?: number;
}

export interface TokenBalance {
  token: string;
  symbol: string;
  balance: string;
  decimals: number;
  valueUsd?: number;
}

export interface WalletTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  timestamp: number;
  type: 'TRADE' | 'APPROVAL' | 'TRANSFER';
}

// =====================================================
// USUARIO
// =====================================================

export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  notifications: NotificationSettings;
  trading: TradingSettings;
  display: DisplaySettings;
}

export interface NotificationSettings {
  enabled: boolean;
  minProfitAlert: number;
  tradeExecuted: boolean;
  tradeFailed: boolean;
  dailySummary: boolean;
}

export interface TradingSettings {
  autoExecute: boolean;
  maxPositionSize: number;
  minProfitPercentage: number;
  maxDailyLoss: number;
  maxConcurrentTrades: number;
  slippageTolerance: number;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  currency: 'USD' | 'EUR';
}

// =====================================================
// TELEGRAM
// =====================================================

export interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramWebAppUser;
  auth_date: number;
  hash: string;
}

export interface TelegramCommand {
  command: string;
  description: string;
  handler: string;
}

// =====================================================
// API RESPONSES
// =====================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =====================================================
// GESTIÓN DE RIESGOS
// =====================================================

export interface RiskMetrics {
  userId: string;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  totalTrades: number;
  winRate: number;
  averageProfit: number;
  maxDrawdown: number;
  riskScore: number;
  lastUpdated: number;
}

export interface RiskLimits {
  maxDailyLoss: number;
  maxPositionSize: number;
  maxConcurrentTrades: number;
  cooldownAfterLoss: number;
  maxSlippage: number;
}

export interface RiskAlert {
  id: string;
  type: RiskAlertType;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export type RiskAlertType = 
  | 'DAILY_LOSS_LIMIT' 
  | 'HIGH_SLIPPAGE' 
  | 'LOW_LIQUIDITY' 
  | 'SYSTEM_ERROR'
  | 'UNUSUAL_ACTIVITY';

// =====================================================
// ESTADÍSTICAS
// =====================================================

export interface TradeStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  totalVolume: number;
  totalProfit: number;
  totalLoss: number;
  netPnL: number;
  averageTradeSize: number;
  averageProfit: number;
  bestTrade: number;
  worstTrade: number;
  period: 'DAY' | 'WEEK' | 'MONTH' | 'ALL';
}

export interface MarketStats {
  marketId: string;
  totalVolume: number;
  totalTrades: number;
  profitLoss: number;
  lastTraded: number;
}

// =====================================================
// EVENTOS WEBSOCKET
// =====================================================

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  data: T;
  timestamp: number;
}

export type WSMessageType = 
  | 'PRICE_UPDATE'
  | 'ORDERBOOK_UPDATE'
  | 'OPPORTUNITY_FOUND'
  | 'TRADE_EXECUTED'
  | 'TRADE_FAILED'
  | 'SYSTEM_STATUS'
  | 'ERROR';

export interface WSPriceUpdate {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  timestamp: number;
}

export interface WSOpportunityUpdate {
  opportunity: ArbitrageOpportunity;
  action: 'NEW' | 'UPDATE' | 'EXPIRED';
}

// =====================================================
// CONFIGURACIÓN
// =====================================================

export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  telegram: {
    botToken: string;
    webAppUrl: string;
  };
  blockchain: {
    rpcUrl: string;
    chainId: number;
    network: 'mainnet' | 'testnet';
  };
  polymarket: {
    apiUrl: string;
    wsUrl: string;
  };
  arbitrage: ArbitrageConfig;
  risk: RiskLimits;
}

// =====================================================
// CONSTANTES
// =====================================================

export const POLYGON_CHAIN_ID = 137;
export const POLYGON_MUMBAI_CHAIN_ID = 80001;

export const USDC_ADDRESS_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
export const MATIC_ADDRESS = '0x0000000000000000000000000000000000001010';

export const MIN_GAS_LIMIT = 100000;
export const DEFAULT_GAS_PRICE_GWEI = 30;

export const TELEGRAM_COMMANDS: TelegramCommand[] = [
  { command: 'start', description: 'Iniciar la aplicación', handler: 'handleStart' },
  { command: 'arbitraje', description: 'Buscar oportunidades de arbitraje', handler: 'handleArbitrage' },
  { command: 'wallet', description: 'Conectar/desconectar wallet', handler: 'handleWallet' },
  { command: 'historial', description: 'Ver historial de operaciones', handler: 'handleHistory' },
  { command: 'config', description: 'Configurar preferencias', handler: 'handleConfig' },
  { command: 'help', description: 'Mostrar ayuda', handler: 'handleHelp' },
  { command: 'legal', description: 'Información legal y disclaimer', handler: 'handleLegal' },
];
