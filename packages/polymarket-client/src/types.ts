// =====================================================
// Tipos específicos de Polymarket API
// =====================================================

export interface PolymarketMarket {
  condition_id: string;
  question_id: string;
  tokens: PolymarketToken[];
  minimum_order_size: string;
  minimum_tick_size: string;
  description: string;
  category: string;
  end_date_iso: string;
  game_start_time: string | null;
  question: string;
  market_slug: string;
  min_incentive_size: string;
  max_incentive_spread: string;
  active: boolean;
  closed: boolean;
  seconds_delay: number;
  icon: string;
  fpmm: string;
}

export interface PolymarketToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

export interface PolymarketOrderBook {
  market: string;
  asset_id: string;
  timestamp: number;
  bids: PolymarketOrderBookEntry[];
  asks: PolymarketOrderBookEntry[];
  hash: string;
}

export interface PolymarketOrderBookEntry {
  price: string;
  size: string;
}

export interface PolymarketOrder {
  id: string;
  owner: string;
  maker_address: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  original_size: string;
  size_matched: string;
  price: string;
  associate_trades: string[];
  created_at: number;
  status: PolymarketOrderStatus;
  expiration: number;
  type: 'GTC' | 'GTD' | 'FOK';
}

export type PolymarketOrderStatus = 
  | 'live'
  | 'matched'
  | 'cancelled'
  | 'expired';

export interface PolymarketTrade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  fee_rate_bps: string;
  match_time: number;
  status: 'CONFIRMED' | 'PENDING';
  outcome: string;
  bucket_index: number;
  owner: string;
  maker_address: string;
  transaction_hash: string;
  trader_side: 'MAKER' | 'TAKER';
}

export interface PolymarketApiKey {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
}

export interface PolymarketCreateOrderParams {
  tokenId: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  expiration?: number;
  nonce?: string;
}

export interface PolymarketSignedOrder {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: number;
  signatureType: number;
  signature: string;
}

export interface PolymarketPriceSnapshot {
  tokenId: string;
  outcome: 'YES' | 'NO';
  price: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  midPrice: number;
  timestamp: number;
}

export interface PolymarketMarketPrices {
  marketId: string;
  yes: PolymarketPriceSnapshot;
  no: PolymarketPriceSnapshot;
  totalPrice: number;
  arbitrageOpportunity: boolean;
  profitPercentage: number;
}

// WebSocket message types
export interface WSSubscribeMessage {
  auth?: {
    apiKey: string;
    secret: string;
    passphrase: string;
  };
  type: 'subscribe';
  channel: 'market' | 'user';
  markets?: string[];
  assets_ids?: string[];
}

export interface WSMarketMessage {
  event_type: 'book' | 'price_change' | 'last_trade_price';
  market: string;
  asset_id: string;
  timestamp: number;
  price?: string;
  changes?: Array<{
    side: 'buy' | 'sell';
    price: string;
    delta: string;
  }>;
}
