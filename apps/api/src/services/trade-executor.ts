// =====================================================
// Trade Executor Service
// =====================================================

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { PolymarketClient, OrderBuilder } from '@polyarbitrage/polymarket-client';
import type { ArbitrageOpportunity, TradeExecution, TradeStatus } from '@polyarbitrage/types';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { websocketServer } from '../websocket/index.js';

interface ExecuteTradeParams {
  opportunity: ArbitrageOpportunity;
  userAddress: string;
  investmentUsd: number;
  signer: ethers.Signer;
}

interface TradeResult {
  success: boolean;
  yesTrade?: TradeExecution;
  noTrade?: TradeExecution;
  totalInvested: number;
  expectedProfit: number;
  gasCost: number;
  error?: string;
}

export class TradeExecutor extends EventEmitter {
  private client: PolymarketClient;
  private orderBuilder: OrderBuilder;
  private activeTrades: Map<string, TradeExecution> = new Map();
  private maxConcurrentTrades: number;

  constructor() {
    super();
    this.client = new PolymarketClient({
      baseUrl: config.polymarket.clobApi,
    });
    this.orderBuilder = new OrderBuilder({
      chainId: config.blockchain.chainId,
    });
    this.maxConcurrentTrades = config.arbitrage.maxConcurrentTrades;
  }

  /**
   * Ejecuta una operación de arbitraje
   */
  async executeArbitrage(params: ExecuteTradeParams): Promise<TradeResult> {
    const { opportunity, userAddress, investmentUsd, signer } = params;

    logger.info(`Executing arbitrage for opportunity ${opportunity.id}`, {
      investmentUsd,
      profitPercentage: opportunity.profitPercentage,
    });

    // Verificar límites
    if (this.activeTrades.size >= this.maxConcurrentTrades) {
      return {
        success: false,
        totalInvested: 0,
        expectedProfit: 0,
        gasCost: 0,
        error: 'Maximum concurrent trades reached',
      };
    }

    // Verificar que la oportunidad siga siendo válida
    if (opportunity.expiresAt < Date.now()) {
      return {
        success: false,
        totalInvested: 0,
        expectedProfit: 0,
        gasCost: 0,
        error: 'Opportunity expired',
      };
    }

    // Calcular beneficio con gas
    const estimatedGasCost = await this.estimateGasCost();
    const profitCalc = this.orderBuilder.calculateArbitrageProfit(
      opportunity.yesPrice,
      opportunity.noPrice,
      investmentUsd,
      estimatedGasCost
    );

    if (!profitCalc.isViable) {
      return {
        success: false,
        totalInvested: 0,
        expectedProfit: 0,
        gasCost: estimatedGasCost,
        error: 'Trade not profitable after gas costs',
      };
    }

    try {
      // Crear órdenes
      const yesTokenId = opportunity.id + '_yes'; // En prod, obtener del mercado real
      const noTokenId = opportunity.id + '_no';

      const { yesOrder, noOrder } = this.orderBuilder.buildArbitrageOrders(
        yesTokenId,
        noTokenId,
        opportunity.yesPrice,
        opportunity.noPrice,
        investmentUsd
      );

      // Validar órdenes
      const yesValidation = this.orderBuilder.validateOrder(yesOrder);
      const noValidation = this.orderBuilder.validateOrder(noOrder);

      if (!yesValidation.valid || !noValidation.valid) {
        return {
          success: false,
          totalInvested: 0,
          expectedProfit: 0,
          gasCost: 0,
          error: `Invalid orders: ${[...yesValidation.errors, ...noValidation.errors].join(', ')}`,
        };
      }

      // Crear registros de trades
      const yesTrade = this.createTradeRecord(
        opportunity.marketId,
        'YES',
        yesOrder.size,
        yesOrder.price
      );
      const noTrade = this.createTradeRecord(
        opportunity.marketId,
        'NO',
        noOrder.size,
        noOrder.price
      );

      this.activeTrades.set(yesTrade.id, yesTrade);
      this.activeTrades.set(noTrade.id, noTrade);

      // Notificar inicio
      this.emitTradeUpdate(yesTrade);
      this.emitTradeUpdate(noTrade);

      // Ejecutar trades (simulado - en prod usar client con signer)
      // const yesResult = await this.client.createOrder(yesOrder);
      // const noResult = await this.client.createOrder(noOrder);

      // Simular ejecución exitosa
      await this.simulateTradeExecution(yesTrade);
      await this.simulateTradeExecution(noTrade);

      // Actualizar estados
      yesTrade.status = 'CONFIRMED';
      noTrade.status = 'CONFIRMED';

      this.emitTradeUpdate(yesTrade);
      this.emitTradeUpdate(noTrade);

      logger.info(`Arbitrage executed successfully`, {
        opportunityId: opportunity.id,
        yesTrade: yesTrade.id,
        noTrade: noTrade.id,
      });

      return {
        success: true,
        yesTrade,
        noTrade,
        totalInvested: investmentUsd,
        expectedProfit: profitCalc.netProfit,
        gasCost: estimatedGasCost,
      };

    } catch (error) {
      logger.error('Failed to execute arbitrage', error);

      return {
        success: false,
        totalInvested: 0,
        expectedProfit: 0,
        gasCost: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Estima el costo de gas para las transacciones
   */
  private async estimateGasCost(): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
      const feeData = await provider.getFeeData();
      
      const gasPrice = feeData.gasPrice || BigInt(30000000000); // 30 gwei default
      const estimatedGas = BigInt(200000); // Gas estimado para 2 trades
      
      const totalWei = gasPrice * estimatedGas;
      const maticCost = Number(totalWei) / 1e18;
      
      // Precio aproximado de MATIC (en prod, obtener de oracle)
      const maticPriceUsd = 0.80;
      
      return maticCost * maticPriceUsd;
    } catch (error) {
      logger.error('Failed to estimate gas cost', error);
      return 0.10; // Default $0.10
    }
  }

  /**
   * Crea un registro de trade
   */
  private createTradeRecord(
    marketId: string,
    outcome: 'YES' | 'NO',
    amount: number,
    price: number
  ): TradeExecution {
    return {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      marketId,
      side: 'BUY',
      outcome,
      amount,
      price,
      executedPrice: price,
      slippage: 0,
      status: 'PENDING',
      timestamp: Date.now(),
    };
  }

  /**
   * Simula la ejecución de un trade (para desarrollo)
   */
  private async simulateTradeExecution(trade: TradeExecution): Promise<void> {
    trade.status = 'SUBMITTED';
    this.emitTradeUpdate(trade);

    // Simular latencia de blockchain
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simular slippage pequeño
    trade.executedPrice = trade.price * (1 + (Math.random() - 0.5) * 0.01);
    trade.slippage = (trade.executedPrice - trade.price) / trade.price;
    trade.txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    trade.gasUsed = 100000 + Math.floor(Math.random() * 50000);
  }

  /**
   * Emite actualización de trade
   */
  private emitTradeUpdate(trade: TradeExecution): void {
    this.emit('tradeUpdate', trade);
    
    websocketServer.broadcast({
      type: trade.status === 'CONFIRMED' ? 'TRADE_EXECUTED' : 
            trade.status === 'FAILED' ? 'TRADE_FAILED' : 'TRADE_EXECUTED',
      data: trade,
      timestamp: Date.now(),
    });
  }

  /**
   * Obtiene trades activos
   */
  getActiveTrades(): TradeExecution[] {
    return Array.from(this.activeTrades.values());
  }

  /**
   * Cancela un trade pendiente
   */
  async cancelTrade(tradeId: string): Promise<boolean> {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade || trade.status !== 'PENDING') {
      return false;
    }

    // En producción, cancelar en Polymarket
    trade.status = 'CANCELLED';
    this.activeTrades.delete(tradeId);
    this.emitTradeUpdate(trade);
    
    return true;
  }
}

// Singleton
export const tradeExecutor = new TradeExecutor();
