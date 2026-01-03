// =====================================================
// Order Builder para Polymarket
// =====================================================

import { ethers } from 'ethers';
import type { PolymarketCreateOrderParams, PolymarketSignedOrder } from './types.js';

const EXCHANGE_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const USDC_DECIMALS = 6;
const CONDITIONAL_TOKEN_DECIMALS = 6;

export interface OrderBuilderConfig {
  chainId?: number;
  exchangeAddress?: string;
}

export class OrderBuilder {
  private chainId: number;
  private exchangeAddress: string;

  constructor(config: OrderBuilderConfig = {}) {
    this.chainId = config.chainId || 137; // Polygon mainnet
    this.exchangeAddress = config.exchangeAddress || EXCHANGE_ADDRESS;
  }

  /**
   * Construye los parámetros de una orden de compra
   */
  buildBuyOrder(
    tokenId: string,
    price: number,
    sizeInUSD: number
  ): PolymarketCreateOrderParams {
    // Para comprar, calculamos cuántos tokens recibimos por el USDC que gastamos
    const tokensToReceive = sizeInUSD / price;
    
    return {
      tokenId,
      price: this.normalizePrice(price),
      size: this.normalizeSize(tokensToReceive),
      side: 'BUY',
    };
  }

  /**
   * Construye los parámetros de una orden de venta
   */
  buildSellOrder(
    tokenId: string,
    price: number,
    tokensToSell: number
  ): PolymarketCreateOrderParams {
    return {
      tokenId,
      price: this.normalizePrice(price),
      size: this.normalizeSize(tokensToSell),
      side: 'SELL',
    };
  }

  /**
   * Construye una orden de arbitraje (compra YES + NO)
   */
  buildArbitrageOrders(
    yesTokenId: string,
    noTokenId: string,
    yesPrice: number,
    noPrice: number,
    investmentUSD: number
  ): { yesOrder: PolymarketCreateOrderParams; noOrder: PolymarketCreateOrderParams } {
    const totalPrice = yesPrice + noPrice;
    
    if (totalPrice >= 1) {
      throw new Error('No hay oportunidad de arbitraje: YES + NO >= 1');
    }

    // Dividir inversión proporcionalmente
    const yesInvestment = investmentUSD * (yesPrice / totalPrice);
    const noInvestment = investmentUSD * (noPrice / totalPrice);

    return {
      yesOrder: this.buildBuyOrder(yesTokenId, yesPrice, yesInvestment),
      noOrder: this.buildBuyOrder(noTokenId, noPrice, noInvestment),
    };
  }

  /**
   * Calcula el beneficio esperado de un arbitraje
   */
  calculateArbitrageProfit(
    yesPrice: number,
    noPrice: number,
    investmentUSD: number,
    gasCostUSD: number = 0.05
  ): {
    grossProfit: number;
    netProfit: number;
    profitPercentage: number;
    isViable: boolean;
  } {
    const totalPrice = yesPrice + noPrice;
    const grossProfit = investmentUSD * (1 - totalPrice);
    const netProfit = grossProfit - gasCostUSD;
    const profitPercentage = (netProfit / investmentUSD) * 100;

    return {
      grossProfit,
      netProfit,
      profitPercentage,
      isViable: netProfit > 0,
    };
  }

  /**
   * Calcula el tamaño óptimo de posición dado el orderbook
   */
  calculateOptimalSize(
    orderbook: Array<{ price: number; size: number }>,
    maxPrice: number,
    maxInvestment: number
  ): { size: number; avgPrice: number; totalCost: number } {
    let remainingInvestment = maxInvestment;
    let totalSize = 0;
    let totalCost = 0;

    for (const level of orderbook) {
      if (level.price > maxPrice) break;

      const maxSizeAtLevel = remainingInvestment / level.price;
      const sizeAtLevel = Math.min(level.size, maxSizeAtLevel);
      const costAtLevel = sizeAtLevel * level.price;

      totalSize += sizeAtLevel;
      totalCost += costAtLevel;
      remainingInvestment -= costAtLevel;

      if (remainingInvestment <= 0) break;
    }

    return {
      size: totalSize,
      avgPrice: totalSize > 0 ? totalCost / totalSize : 0,
      totalCost,
    };
  }

  /**
   * Normaliza precio a formato de Polymarket
   */
  private normalizePrice(price: number): number {
    // Polymarket usa precios entre 0 y 1 con 4 decimales
    return Math.round(price * 10000) / 10000;
  }

  /**
   * Normaliza tamaño a formato de Polymarket
   */
  private normalizeSize(size: number): number {
    // Tamaño en tokens (6 decimales)
    return Math.round(size * 1e6) / 1e6;
  }

  /**
   * Convierte USDC a unidades base (6 decimales)
   */
  usdcToUnits(amount: number): bigint {
    return BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
  }

  /**
   * Convierte unidades base a USDC
   */
  unitsToUsdc(units: bigint): number {
    return Number(units) / 10 ** USDC_DECIMALS;
  }

  /**
   * Valida que una orden sea ejecutable
   */
  validateOrder(params: PolymarketCreateOrderParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.price <= 0 || params.price >= 1) {
      errors.push('El precio debe estar entre 0 y 1');
    }

    if (params.size <= 0) {
      errors.push('El tamaño debe ser mayor a 0');
    }

    if (params.size < 0.01) {
      errors.push('El tamaño mínimo es 0.01');
    }

    if (!params.tokenId || params.tokenId.length !== 66) {
      errors.push('Token ID inválido');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
