// =====================================================
// Polymarket WebSocket Client
// =====================================================

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { PolymarketApiKey, WSSubscribeMessage, WSMarketMessage } from './types.js';

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

export interface PolymarketWSConfig {
  url?: string;
  apiKey?: PolymarketApiKey;
  reconnectInterval?: number;
  pingInterval?: number;
}

export interface PriceUpdate {
  marketId: string;
  tokenId: string;
  outcome: 'YES' | 'NO';
  price: number;
  timestamp: number;
}

export interface OrderBookUpdate {
  marketId: string;
  tokenId: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  timestamp: number;
}

export class PolymarketWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private apiKey?: PolymarketApiKey;
  private reconnectInterval: number;
  private pingInterval: number;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private subscribedMarkets: Set<string> = new Set();

  constructor(config: PolymarketWSConfig = {}) {
    super();
    this.url = config.url || WS_URL;
    this.apiKey = config.apiKey;
    this.reconnectInterval = config.reconnectInterval || 5000;
    this.pingInterval = config.pingInterval || 30000;
  }

  /**
   * Conectar al WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          console.log('[PolymarketWS] Conectado');
          this.isConnected = true;
          this.startPingInterval();
          
          // Re-suscribir a mercados previos
          if (this.subscribedMarkets.size > 0) {
            this.subscribeToMarkets(Array.from(this.subscribedMarkets));
          }
          
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('[PolymarketWS] Error parsing message:', error);
          }
        });

        this.ws.on('close', () => {
          console.log('[PolymarketWS] Desconectado');
          this.isConnected = false;
          this.stopPingInterval();
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        this.ws.on('error', (error) => {
          console.error('[PolymarketWS] Error:', error);
          this.emit('error', error);
          if (!this.isConnected) {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribedMarkets.clear();
  }

  /**
   * Suscribirse a mercados
   */
  subscribeToMarkets(assetIds: string[]): void {
    if (!this.isConnected || !this.ws) {
      console.warn('[PolymarketWS] No conectado, guardando suscripciones para después');
      assetIds.forEach(id => this.subscribedMarkets.add(id));
      return;
    }

    const message: WSSubscribeMessage = {
      type: 'subscribe',
      channel: 'market',
      assets_ids: assetIds,
    };

    if (this.apiKey) {
      message.auth = {
        apiKey: this.apiKey.apiKey,
        secret: this.apiKey.apiSecret,
        passphrase: this.apiKey.apiPassphrase,
      };
    }

    this.ws.send(JSON.stringify(message));
    assetIds.forEach(id => this.subscribedMarkets.add(id));
    console.log(`[PolymarketWS] Suscrito a ${assetIds.length} tokens`);
  }

  /**
   * Desuscribirse de mercados
   */
  unsubscribeFromMarkets(assetIds: string[]): void {
    if (!this.isConnected || !this.ws) return;

    const message = {
      type: 'unsubscribe',
      channel: 'market',
      assets_ids: assetIds,
    };

    this.ws.send(JSON.stringify(message));
    assetIds.forEach(id => this.subscribedMarkets.delete(id));
  }

  /**
   * Manejar mensajes entrantes
   */
  private handleMessage(message: any): void {
    if (!message || !message.event_type) return;

    switch (message.event_type) {
      case 'price_change':
        this.handlePriceChange(message);
        break;
      
      case 'book':
        this.handleBookUpdate(message);
        break;
      
      case 'last_trade_price':
        this.handleLastTrade(message);
        break;

      default:
        // Mensaje no reconocido
        break;
    }
  }

  /**
   * Manejar cambio de precio
   */
  private handlePriceChange(message: WSMarketMessage): void {
    const update: PriceUpdate = {
      marketId: message.market,
      tokenId: message.asset_id,
      outcome: this.determineOutcome(message.asset_id),
      price: parseFloat(message.price || '0'),
      timestamp: message.timestamp,
    };

    this.emit('priceUpdate', update);
  }

  /**
   * Manejar actualización de orderbook
   */
  private handleBookUpdate(message: any): void {
    if (!message.changes) return;

    const bids: Array<{ price: number; size: number }> = [];
    const asks: Array<{ price: number; size: number }> = [];

    for (const change of message.changes) {
      const entry = {
        price: parseFloat(change.price),
        size: parseFloat(change.delta),
      };

      if (change.side === 'buy') {
        bids.push(entry);
      } else {
        asks.push(entry);
      }
    }

    const update: OrderBookUpdate = {
      marketId: message.market,
      tokenId: message.asset_id,
      bids,
      asks,
      timestamp: message.timestamp,
    };

    this.emit('orderBookUpdate', update);
  }

  /**
   * Manejar último precio de trade
   */
  private handleLastTrade(message: any): void {
    this.emit('lastTrade', {
      marketId: message.market,
      tokenId: message.asset_id,
      price: parseFloat(message.price || '0'),
      timestamp: message.timestamp,
    });
  }

  /**
   * Determinar si un token es YES o NO (simplificado)
   */
  private determineOutcome(tokenId: string): 'YES' | 'NO' {
    // En una implementación real, esto debería consultarse desde los metadatos del mercado
    return 'YES';
  }

  /**
   * Iniciar intervalo de ping
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.ping();
      }
    }, this.pingInterval);
  }

  /**
   * Detener intervalo de ping
   */
  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Programar reconexión
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    console.log(`[PolymarketWS] Reconectando en ${this.reconnectInterval}ms...`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        console.error('[PolymarketWS] Error al reconectar:', error);
        this.scheduleReconnect();
      }
    }, this.reconnectInterval);
  }

  /**
   * Limpiar timers
   */
  private clearTimers(): void {
    this.stopPingInterval();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Verificar si está conectado
   */
  get connected(): boolean {
    return this.isConnected;
  }
}
