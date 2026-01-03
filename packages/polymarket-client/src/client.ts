// =====================================================
// Polymarket CLOB API Client
// =====================================================

import { ethers } from 'ethers';
import type { Market, PriceData } from '@polyarbitrage/types';
import type {
  PolymarketMarket,
  PolymarketOrderBook,
  PolymarketOrder,
  PolymarketTrade,
  PolymarketApiKey,
  PolymarketCreateOrderParams,
  PolymarketMarketPrices,
} from './types.js';

const CLOB_API_URL = 'https://clob.polymarket.com';
const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

export interface PolymarketClientConfig {
  apiKey?: PolymarketApiKey;
  signer?: ethers.Signer;
  baseUrl?: string;
}

export class PolymarketClient {
  private apiKey?: PolymarketApiKey;
  private signer?: ethers.Signer;
  private baseUrl: string;

  constructor(config: PolymarketClientConfig = {}) {
    this.apiKey = config.apiKey;
    this.signer = config.signer;
    this.baseUrl = config.baseUrl || CLOB_API_URL;
  }

  // =====================================================
  // MARKET DATA
  // =====================================================

  /**
   * Obtiene todos los mercados activos
   */
  async getMarkets(): Promise<PolymarketMarket[]> {
    const response = await this.fetch('/markets');
    return response;
  }

  /**
   * Obtiene un mercado específico
   */
  async getMarket(conditionId: string): Promise<PolymarketMarket> {
    const response = await this.fetch(`/markets/${conditionId}`);
    return response;
  }

  /**
   * Obtiene el orderbook de un token
   */
  async getOrderBook(tokenId: string): Promise<PolymarketOrderBook> {
    const response = await this.fetch(`/book?token_id=${tokenId}`);
    return response;
  }

  /**
   * Obtiene el spread y mejores precios de un token
   */
  async getMidpoint(tokenId: string): Promise<{ mid: number; spread: number }> {
    const response = await this.fetch(`/midpoint?token_id=${tokenId}`);
    return {
      mid: parseFloat(response.mid || '0'),
      spread: parseFloat(response.spread || '0'),
    };
  }

  /**
   * Obtiene el precio de un token
   */
  async getPrice(tokenId: string, side: 'BUY' | 'SELL'): Promise<number> {
    const response = await this.fetch(`/price?token_id=${tokenId}&side=${side}`);
    return parseFloat(response.price || '0');
  }

  /**
   * Obtiene precios completos de un mercado (YES + NO)
   */
  async getMarketPrices(market: PolymarketMarket): Promise<PolymarketMarketPrices> {
    const yesToken = market.tokens.find(t => t.outcome === 'Yes');
    const noToken = market.tokens.find(t => t.outcome === 'No');

    if (!yesToken || !noToken) {
      throw new Error('Market tokens not found');
    }

    const [yesBook, noBook] = await Promise.all([
      this.getOrderBook(yesToken.token_id),
      this.getOrderBook(noToken.token_id),
    ]);

    const yesBestBid = parseFloat(yesBook.bids[0]?.price || '0');
    const yesBestAsk = parseFloat(yesBook.asks[0]?.price || '1');
    const noBestBid = parseFloat(noBook.bids[0]?.price || '0');
    const noBestAsk = parseFloat(noBook.asks[0]?.price || '1');

    const yesPrice = (yesBestBid + yesBestAsk) / 2;
    const noPrice = (noBestBid + noBestAsk) / 2;
    const totalPrice = yesPrice + noPrice;

    const arbitrageOpportunity = totalPrice < 0.995 || totalPrice > 1.005;
    const profitPercentage = arbitrageOpportunity
      ? Math.abs(1 - totalPrice) * 100
      : 0;

    return {
      marketId: market.condition_id,
      yes: {
        tokenId: yesToken.token_id,
        outcome: 'YES',
        price: yesPrice,
        bestBid: yesBestBid,
        bestAsk: yesBestAsk,
        spread: yesBestAsk - yesBestBid,
        midPrice: yesPrice,
        timestamp: Date.now(),
      },
      no: {
        tokenId: noToken.token_id,
        outcome: 'NO',
        price: noPrice,
        bestBid: noBestBid,
        bestAsk: noBestAsk,
        spread: noBestAsk - noBestBid,
        midPrice: noPrice,
        timestamp: Date.now(),
      },
      totalPrice,
      arbitrageOpportunity,
      profitPercentage,
    };
  }

  // =====================================================
  // TRADING (requiere autenticación)
  // =====================================================

  /**
   * Crea una orden
   */
  async createOrder(params: PolymarketCreateOrderParams): Promise<PolymarketOrder> {
    if (!this.signer) {
      throw new Error('Signer required to create orders');
    }

    // Construir y firmar la orden
    const order = await this.buildSignedOrder(params);
    
    const response = await this.fetch('/order', {
      method: 'POST',
      body: JSON.stringify({ order }),
    });

    return response;
  }

  /**
   * Cancela una orden
   */
  async cancelOrder(orderId: string): Promise<void> {
    await this.fetch(`/order/${orderId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Cancela todas las órdenes
   */
  async cancelAllOrders(): Promise<void> {
    await this.fetch('/orders', {
      method: 'DELETE',
    });
  }

  /**
   * Obtiene las órdenes del usuario
   */
  async getOrders(market?: string): Promise<PolymarketOrder[]> {
    const url = market ? `/orders?market=${market}` : '/orders';
    const response = await this.fetch(url);
    return response;
  }

  /**
   * Obtiene los trades del usuario
   */
  async getTrades(market?: string): Promise<PolymarketTrade[]> {
    const url = market ? `/trades?market=${market}` : '/trades';
    const response = await this.fetch(url);
    return response;
  }

  // =====================================================
  // GAMMA API (información adicional de mercados)
  // =====================================================

  /**
   * Obtiene información detallada de mercados desde Gamma API
   */
  async getGammaMarkets(params?: {
    active?: boolean;
    closed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.active !== undefined) queryParams.set('active', String(params.active));
    if (params?.closed !== undefined) queryParams.set('closed', String(params.closed));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));

    const url = `${GAMMA_API_URL}/markets?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.statusText}`);
    }

    return response.json();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Convierte un mercado de Polymarket al formato interno
   */
  marketToInternal(market: PolymarketMarket): Market {
    const yesToken = market.tokens.find(t => t.outcome === 'Yes');
    const noToken = market.tokens.find(t => t.outcome === 'No');

    return {
      id: market.condition_id,
      question: market.question,
      slug: market.market_slug,
      conditionId: market.condition_id,
      active: market.active,
      closed: market.closed,
      endDate: market.end_date_iso,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      volume: '0',
      liquidity: '0',
      outcomes: [
        {
          id: yesToken?.token_id || '',
          name: 'YES',
          price: yesToken?.price || 0,
          token: {
            id: yesToken?.token_id || '',
            tokenId: yesToken?.token_id || '',
            outcome: 'YES',
          },
        },
        {
          id: noToken?.token_id || '',
          name: 'NO',
          price: noToken?.price || 0,
          token: {
            id: noToken?.token_id || '',
            tokenId: noToken?.token_id || '',
            outcome: 'NO',
          },
        },
      ],
    };
  }

  /**
   * Construye una orden firmada
   */
  private async buildSignedOrder(params: PolymarketCreateOrderParams): Promise<any> {
    if (!this.signer) {
      throw new Error('Signer required');
    }

    const address = await this.signer.getAddress();
    const nonce = params.nonce || Date.now().toString();
    const expiration = params.expiration || Math.floor(Date.now() / 1000) + 86400; // 24h

    // Calcular amounts basado en precio y tamaño
    const makerAmount = params.side === 'BUY'
      ? Math.floor(params.size * params.price * 1e6).toString()
      : Math.floor(params.size * 1e6).toString();
    
    const takerAmount = params.side === 'BUY'
      ? Math.floor(params.size * 1e6).toString()
      : Math.floor(params.size * params.price * 1e6).toString();

    const order = {
      salt: Date.now().toString(),
      maker: address,
      signer: address,
      taker: '0x0000000000000000000000000000000000000000',
      tokenId: params.tokenId,
      makerAmount,
      takerAmount,
      expiration: expiration.toString(),
      nonce,
      feeRateBps: '0',
      side: params.side === 'BUY' ? 0 : 1,
      signatureType: 0,
    };

    // Firmar la orden
    const signature = await this.signOrder(order);

    return {
      ...order,
      signature,
    };
  }

  /**
   * Firma una orden
   */
  private async signOrder(order: any): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required');
    }

    // Estructura del mensaje para EIP-712
    const domain = {
      name: 'Polymarket CTF Exchange',
      version: '1',
      chainId: 137, // Polygon
    };

    const types = {
      Order: [
        { name: 'salt', type: 'uint256' },
        { name: 'maker', type: 'address' },
        { name: 'signer', type: 'address' },
        { name: 'taker', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'makerAmount', type: 'uint256' },
        { name: 'takerAmount', type: 'uint256' },
        { name: 'expiration', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'feeRateBps', type: 'uint256' },
        { name: 'side', type: 'uint8' },
        { name: 'signatureType', type: 'uint8' },
      ],
    };

    // @ts-ignore - signTypedData exists on Signer
    const signature = await this.signer.signTypedData(domain, types, order);
    return signature;
  }

  /**
   * Fetch con manejo de errores
   */
  private async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Añadir headers de autenticación si hay API key
    if (this.apiKey) {
      headers['POLY_API_KEY'] = this.apiKey.apiKey;
      headers['POLY_API_SECRET'] = this.apiKey.apiSecret;
      headers['POLY_PASSPHRASE'] = this.apiKey.apiPassphrase;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Polymarket API error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}
