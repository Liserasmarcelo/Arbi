// =====================================================
// Arbitrage Scanner Service
// =====================================================

import { EventEmitter } from 'events';
import { PolymarketClient, PolymarketWebSocket } from '@polyarbitrage/polymarket-client';
import { calculateArbitrageOpportunity } from '@polyarbitrage/utils';
import type { ArbitrageOpportunity, ArbitrageConfig, PriceData, Market } from '@polyarbitrage/types';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { websocketServer } from '../websocket/index.js';

export class ArbitrageScanner extends EventEmitter {
  private client: PolymarketClient;
  private ws: PolymarketWebSocket;
  private markets: Map<string, Market> = new Map();
  private opportunities: Map<string, ArbitrageOpportunity> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private arbitrageConfig: ArbitrageConfig;

  constructor() {
    super();
    
    this.client = new PolymarketClient({
      baseUrl: config.polymarket.clobApi,
    });
    
    this.ws = new PolymarketWebSocket({
      url: config.polymarket.wsUrl,
    });

    this.arbitrageConfig = {
      minProfitPercentage: config.arbitrage.minProfitPercentage,
      maxPositionSizeUsd: config.arbitrage.maxPositionSizeUsd,
      slippageTolerance: config.arbitrage.slippageTolerance,
      maxGasPriceGwei: config.arbitrage.maxGasPriceGwei,
      minLiquidity: 100,
      maxTradesConcurrent: config.arbitrage.maxConcurrentTrades,
    };

    this.setupWebSocketHandlers();
  }

  /**
   * Inicia el scanner de arbitraje
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Arbitrage scanner already running');
      return;
    }

    logger.info('Starting arbitrage scanner...');
    this.isRunning = true;

    try {
      // Cargar mercados activos
      await this.loadMarkets();
      
      // Conectar WebSocket
      await this.ws.connect();
      
      // Suscribirse a todos los tokens
      this.subscribeToMarkets();
      
      // Iniciar escaneo periódico
      this.startPeriodicScan();
      
      logger.info(`Arbitrage scanner started with ${this.markets.size} markets`);
    } catch (error) {
      logger.error('Failed to start arbitrage scanner', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Detiene el scanner
   */
  async stop(): Promise<void> {
    logger.info('Stopping arbitrage scanner...');
    this.isRunning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    this.ws.disconnect();
    this.markets.clear();
    this.opportunities.clear();
    
    logger.info('Arbitrage scanner stopped');
  }

  /**
   * Obtiene las oportunidades actuales
   */
  getOpportunities(): ArbitrageOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(opp => opp.expiresAt > Date.now())
      .sort((a, b) => b.profitPercentage - a.profitPercentage);
  }

  /**
   * Obtiene una oportunidad por ID
   */
  getOpportunity(id: string): ArbitrageOpportunity | undefined {
    const opp = this.opportunities.get(id);
    if (opp && opp.expiresAt > Date.now()) {
      return opp;
    }
    return undefined;
  }

  /**
   * Carga los mercados activos desde Polymarket
   */
  private async loadMarkets(): Promise<void> {
    logger.info('Loading markets from Polymarket...');
    
    try {
      const polymarketMarkets = await this.client.getMarkets();
      
      for (const pm of polymarketMarkets) {
        if (pm.active && !pm.closed) {
          const market = this.client.marketToInternal(pm);
          this.markets.set(market.id, market);
        }
      }
      
      logger.info(`Loaded ${this.markets.size} active markets`);
    } catch (error) {
      logger.error('Failed to load markets', error);
      throw error;
    }
  }

  /**
   * Suscribe a actualizaciones de todos los mercados
   */
  private subscribeToMarkets(): void {
    const tokenIds: string[] = [];
    
    for (const market of this.markets.values()) {
      for (const outcome of market.outcomes) {
        if (outcome.token?.tokenId) {
          tokenIds.push(outcome.token.tokenId);
        }
      }
    }
    
    if (tokenIds.length > 0) {
      this.ws.subscribeToMarkets(tokenIds);
      logger.info(`Subscribed to ${tokenIds.length} tokens`);
    }
  }

  /**
   * Configura handlers del WebSocket
   */
  private setupWebSocketHandlers(): void {
    this.ws.on('priceUpdate', (update) => {
      this.handlePriceUpdate(update);
    });

    this.ws.on('orderBookUpdate', (update) => {
      this.handleOrderBookUpdate(update);
    });

    this.ws.on('connected', () => {
      logger.info('WebSocket connected');
    });

    this.ws.on('disconnected', () => {
      logger.warn('WebSocket disconnected');
    });

    this.ws.on('error', (error) => {
      logger.error('WebSocket error', error);
    });
  }

  /**
   * Maneja actualización de precio
   */
  private handlePriceUpdate(update: any): void {
    // Buscar el mercado correspondiente
    for (const [marketId, market] of this.markets) {
      const outcome = market.outcomes.find(o => o.token?.tokenId === update.tokenId);
      
      if (outcome) {
        outcome.price = update.price;
        this.checkMarketForArbitrage(market);
        break;
      }
    }
  }

  /**
   * Maneja actualización de orderbook
   */
  private handleOrderBookUpdate(update: any): void {
    // Similar al anterior pero con datos de orderbook
    // En una implementación completa, actualizaríamos los precios bid/ask
  }

  /**
   * Verifica si hay oportunidad de arbitraje en un mercado
   */
  private checkMarketForArbitrage(market: Market): void {
    const yesOutcome = market.outcomes.find(o => o.name === 'YES');
    const noOutcome = market.outcomes.find(o => o.name === 'NO');

    if (!yesOutcome || !noOutcome) return;

    const priceData: PriceData = {
      marketId: market.id,
      yesPrice: yesOutcome.price,
      noPrice: noOutcome.price,
      yesBestBid: yesOutcome.price * 0.99, // Aproximación
      yesBestAsk: yesOutcome.price * 1.01,
      noBestBid: noOutcome.price * 0.99,
      noBestAsk: noOutcome.price * 1.01,
      timestamp: Date.now(),
    };

    const opportunity = calculateArbitrageOpportunity(
      priceData,
      this.arbitrageConfig,
      market.question
    );

    if (opportunity) {
      const existingOpp = this.opportunities.get(opportunity.id);
      
      // Nueva oportunidad o actualización significativa
      if (!existingOpp || 
          Math.abs(existingOpp.profitPercentage - opportunity.profitPercentage) > 0.1) {
        this.opportunities.set(opportunity.id, opportunity);
        
        // Emitir evento
        this.emit('opportunity', opportunity);
        
        // Notificar a clientes WebSocket
        websocketServer.broadcast({
          type: 'OPPORTUNITY_FOUND',
          data: {
            opportunity,
            action: existingOpp ? 'UPDATE' : 'NEW',
          },
          timestamp: Date.now(),
        });
        
        logger.info(`Arbitrage opportunity found: ${opportunity.profitPercentage.toFixed(2)}% profit`, {
          marketId: market.id,
          yesPrice: yesOutcome.price,
          noPrice: noOutcome.price,
        });
      }
    } else {
      // Eliminar oportunidad expirada si existe
      const expiredOpp = Array.from(this.opportunities.values())
        .find(o => o.marketId === market.id);
      
      if (expiredOpp) {
        this.opportunities.delete(expiredOpp.id);
        
        websocketServer.broadcast({
          type: 'OPPORTUNITY_FOUND',
          data: {
            opportunity: expiredOpp,
            action: 'EXPIRED',
          },
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Inicia escaneo periódico
   */
  private startPeriodicScan(): void {
    this.scanInterval = setInterval(async () => {
      await this.performFullScan();
    }, config.arbitrage.scanIntervalMs);
  }

  /**
   * Realiza un escaneo completo de todos los mercados
   */
  private async performFullScan(): Promise<void> {
    if (!this.isRunning) return;

    // Limpiar oportunidades expiradas
    const now = Date.now();
    for (const [id, opp] of this.opportunities) {
      if (opp.expiresAt < now) {
        this.opportunities.delete(id);
      }
    }

    // Escanear mercados
    for (const market of this.markets.values()) {
      try {
        this.checkMarketForArbitrage(market);
      } catch (error) {
        logger.error(`Error scanning market ${market.id}`, error);
      }
    }
  }

  /**
   * Actualiza la configuración del scanner
   */
  updateConfig(newConfig: Partial<ArbitrageConfig>): void {
    this.arbitrageConfig = {
      ...this.arbitrageConfig,
      ...newConfig,
    };
    logger.info('Arbitrage scanner config updated', this.arbitrageConfig);
  }

  /**
   * Estado del scanner
   */
  getStatus(): {
    isRunning: boolean;
    marketsCount: number;
    opportunitiesCount: number;
    config: ArbitrageConfig;
  } {
    return {
      isRunning: this.isRunning,
      marketsCount: this.markets.size,
      opportunitiesCount: this.opportunities.size,
      config: this.arbitrageConfig,
    };
  }
}
