// =====================================================
// Risk Manager Service
// =====================================================

import { EventEmitter } from 'events';
import type { RiskMetrics, RiskLimits, RiskAlert, TradeExecution, ArbitrageOpportunity } from '@polyarbitrage/types';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { websocketServer } from '../websocket/index.js';

interface UserRiskState {
  metrics: RiskMetrics;
  limits: RiskLimits;
  dailyTrades: TradeExecution[];
  inCooldown: boolean;
  cooldownEndsAt?: number;
}

export class RiskManager extends EventEmitter {
  private userStates: Map<string, UserRiskState> = new Map();
  private defaultLimits: RiskLimits;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    this.defaultLimits = {
      maxDailyLoss: config.risk.maxDailyLossUsd,
      maxPositionSize: config.arbitrage.maxPositionSizeUsd,
      maxConcurrentTrades: config.arbitrage.maxConcurrentTrades,
      cooldownAfterLoss: config.risk.cooldownAfterLossMinutes,
      maxSlippage: config.arbitrage.slippageTolerance,
    };

    // Limpiar estados diarios a medianoche
    this.startDailyReset();
  }

  /**
   * Verifica si un usuario puede ejecutar un trade
   */
  canExecuteTrade(
    userId: string,
    opportunity: ArbitrageOpportunity,
    investmentUsd: number
  ): { allowed: boolean; reason?: string } {
    const state = this.getOrCreateState(userId);

    // Verificar cooldown
    if (state.inCooldown) {
      const remaining = (state.cooldownEndsAt || 0) - Date.now();
      if (remaining > 0) {
        return {
          allowed: false,
          reason: `En periodo de cooldown. Espera ${Math.ceil(remaining / 60000)} minutos.`,
        };
      }
      // Cooldown terminado
      state.inCooldown = false;
      state.cooldownEndsAt = undefined;
    }

    // Verificar límite de pérdida diaria
    const dailyLoss = this.calculateDailyLoss(state);
    if (dailyLoss + investmentUsd > state.limits.maxDailyLoss) {
      return {
        allowed: false,
        reason: `Límite de pérdida diaria alcanzado ($${state.limits.maxDailyLoss}).`,
      };
    }

    // Verificar tamaño máximo de posición
    if (investmentUsd > state.limits.maxPositionSize) {
      return {
        allowed: false,
        reason: `Tamaño de posición excede el límite ($${state.limits.maxPositionSize}).`,
      };
    }

    // Verificar trades concurrentes
    const activeTrades = state.dailyTrades.filter(
      t => t.status === 'PENDING' || t.status === 'SUBMITTED'
    );
    if (activeTrades.length >= state.limits.maxConcurrentTrades) {
      return {
        allowed: false,
        reason: `Máximo de trades concurrentes alcanzado (${state.limits.maxConcurrentTrades}).`,
      };
    }

    // Verificar confianza de la oportunidad
    if (opportunity.confidence === 'LOW' && investmentUsd > state.limits.maxPositionSize * 0.5) {
      return {
        allowed: false,
        reason: 'Inversión demasiado alta para oportunidad de baja confianza.',
      };
    }

    return { allowed: true };
  }

  /**
   * Registra un trade completado
   */
  recordTrade(userId: string, trade: TradeExecution): void {
    const state = this.getOrCreateState(userId);
    state.dailyTrades.push(trade);

    // Actualizar métricas
    this.updateMetrics(state, trade);

    // Verificar si necesita entrar en cooldown
    if (trade.status === 'FAILED' || this.calculateDailyLoss(state) > state.limits.maxDailyLoss * 0.8) {
      this.triggerCooldown(userId, state);
    }

    // Emitir evento
    this.emit('tradeRecorded', { userId, trade, metrics: state.metrics });
  }

  /**
   * Obtiene las métricas de riesgo de un usuario
   */
  getMetrics(userId: string): RiskMetrics {
    const state = this.getOrCreateState(userId);
    return { ...state.metrics };
  }

  /**
   * Obtiene los límites de riesgo de un usuario
   */
  getLimits(userId: string): RiskLimits {
    const state = this.getOrCreateState(userId);
    return { ...state.limits };
  }

  /**
   * Actualiza los límites de riesgo de un usuario
   */
  updateLimits(userId: string, newLimits: Partial<RiskLimits>): RiskLimits {
    const state = this.getOrCreateState(userId);
    
    // Validar límites
    if (newLimits.maxDailyLoss !== undefined && newLimits.maxDailyLoss < 1) {
      throw new Error('maxDailyLoss debe ser al menos $1');
    }
    if (newLimits.maxPositionSize !== undefined && newLimits.maxPositionSize < 1) {
      throw new Error('maxPositionSize debe ser al menos $1');
    }

    state.limits = { ...state.limits, ...newLimits };
    
    logger.info(`Risk limits updated for user ${userId}`, state.limits);
    
    return state.limits;
  }

  /**
   * Verifica alertas de riesgo
   */
  checkAlerts(userId: string): RiskAlert[] {
    const state = this.getOrCreateState(userId);
    const alerts: RiskAlert[] = [];

    const dailyLoss = this.calculateDailyLoss(state);
    const dailyLossPercent = (dailyLoss / state.limits.maxDailyLoss) * 100;

    // Alerta de pérdida diaria
    if (dailyLossPercent >= 80) {
      alerts.push({
        id: `alert_${userId}_dailyloss_${Date.now()}`,
        type: 'DAILY_LOSS_LIMIT',
        severity: dailyLossPercent >= 100 ? 'CRITICAL' : 'WARNING',
        message: `Has usado ${dailyLossPercent.toFixed(0)}% de tu límite de pérdida diaria.`,
        timestamp: Date.now(),
        acknowledged: false,
      });
    }

    // Alerta de win rate bajo
    if (state.metrics.totalTrades >= 10 && state.metrics.winRate < 0.4) {
      alerts.push({
        id: `alert_${userId}_winrate_${Date.now()}`,
        type: 'UNUSUAL_ACTIVITY',
        severity: 'WARNING',
        message: `Tu win rate está bajo (${(state.metrics.winRate * 100).toFixed(0)}%). Considera revisar tu estrategia.`,
        timestamp: Date.now(),
        acknowledged: false,
      });
    }

    // Enviar alertas por WebSocket
    if (alerts.length > 0) {
      websocketServer.sendToUser(userId, {
        type: 'SYSTEM_STATUS',
        data: { alerts },
        timestamp: Date.now(),
      });
    }

    return alerts;
  }

  /**
   * Obtiene o crea el estado de riesgo de un usuario
   */
  private getOrCreateState(userId: string): UserRiskState {
    let state = this.userStates.get(userId);
    
    if (!state) {
      state = {
        metrics: {
          userId,
          dailyPnL: 0,
          weeklyPnL: 0,
          monthlyPnL: 0,
          totalTrades: 0,
          winRate: 0,
          averageProfit: 0,
          maxDrawdown: 0,
          riskScore: 50,
          lastUpdated: Date.now(),
        },
        limits: { ...this.defaultLimits },
        dailyTrades: [],
        inCooldown: false,
      };
      this.userStates.set(userId, state);
    }
    
    return state;
  }

  /**
   * Calcula la pérdida diaria
   */
  private calculateDailyLoss(state: UserRiskState): number {
    return state.dailyTrades
      .filter(t => t.status === 'CONFIRMED' || t.status === 'FAILED')
      .reduce((sum, t) => {
        const pnl = t.status === 'FAILED' 
          ? -t.amount 
          : (t.executedPrice - t.price) * t.amount;
        return sum + (pnl < 0 ? Math.abs(pnl) : 0);
      }, 0);
  }

  /**
   * Actualiza las métricas después de un trade
   */
  private updateMetrics(state: UserRiskState, trade: TradeExecution): void {
    const m = state.metrics;
    
    m.totalTrades++;
    
    if (trade.status === 'CONFIRMED') {
      const pnl = (trade.executedPrice - trade.price) * trade.amount;
      m.dailyPnL += pnl;
      m.weeklyPnL += pnl;
      m.monthlyPnL += pnl;
      
      if (pnl > 0) {
        // Actualizar win rate (promedio móvil)
        const successfulTrades = Math.round(m.winRate * (m.totalTrades - 1)) + 1;
        m.winRate = successfulTrades / m.totalTrades;
      } else {
        const successfulTrades = Math.round(m.winRate * (m.totalTrades - 1));
        m.winRate = successfulTrades / m.totalTrades;
        
        // Actualizar max drawdown
        if (Math.abs(pnl) > m.maxDrawdown) {
          m.maxDrawdown = Math.abs(pnl);
        }
      }
      
      // Actualizar profit promedio
      m.averageProfit = m.dailyPnL / m.totalTrades;
    } else if (trade.status === 'FAILED') {
      // Trade fallido cuenta como pérdida
      const successfulTrades = Math.round(m.winRate * (m.totalTrades - 1));
      m.winRate = successfulTrades / m.totalTrades;
    }
    
    // Calcular risk score (0-100, menor es mejor)
    m.riskScore = this.calculateRiskScore(state);
    m.lastUpdated = Date.now();
  }

  /**
   * Calcula el score de riesgo
   */
  private calculateRiskScore(state: UserRiskState): number {
    const m = state.metrics;
    let score = 50; // Base
    
    // Win rate afecta el score
    if (m.winRate < 0.5) score += (0.5 - m.winRate) * 40;
    else score -= (m.winRate - 0.5) * 20;
    
    // Pérdida diaria afecta el score
    const dailyLoss = this.calculateDailyLoss(state);
    const dailyLossPercent = dailyLoss / state.limits.maxDailyLoss;
    score += dailyLossPercent * 30;
    
    // Drawdown afecta el score
    if (m.maxDrawdown > state.limits.maxPositionSize * 0.5) {
      score += 15;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Activa el periodo de cooldown
   */
  private triggerCooldown(userId: string, state: UserRiskState): void {
    state.inCooldown = true;
    state.cooldownEndsAt = Date.now() + state.limits.cooldownAfterLoss * 60 * 1000;
    
    logger.warn(`Cooldown triggered for user ${userId}`, {
      endsAt: new Date(state.cooldownEndsAt).toISOString(),
    });
    
    // Notificar al usuario
    websocketServer.sendToUser(userId, {
      type: 'SYSTEM_STATUS',
      data: {
        alert: {
          type: 'DAILY_LOSS_LIMIT',
          severity: 'WARNING',
          message: `Has entrado en periodo de cooldown por ${state.limits.cooldownAfterLoss} minutos.`,
        },
      },
      timestamp: Date.now(),
    });
    
    this.emit('cooldownTriggered', { userId, endsAt: state.cooldownEndsAt });
  }

  /**
   * Inicia el reset diario
   */
  private startDailyReset(): void {
    // Calcular tiempo hasta medianoche
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      this.resetDailyMetrics();
      // Continuar con intervalo de 24 horas
      this.cleanupInterval = setInterval(() => {
        this.resetDailyMetrics();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Resetea métricas diarias
   */
  private resetDailyMetrics(): void {
    logger.info('Resetting daily metrics for all users');
    
    for (const [userId, state] of this.userStates) {
      // Mover P&L diario a semanal/mensual
      state.metrics.weeklyPnL += state.metrics.dailyPnL;
      state.metrics.monthlyPnL += state.metrics.dailyPnL;
      state.metrics.dailyPnL = 0;
      
      // Limpiar trades del día
      state.dailyTrades = [];
      
      // Resetear cooldown
      state.inCooldown = false;
      state.cooldownEndsAt = undefined;
    }
  }

  /**
   * Detiene el manager
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton
export const riskManager = new RiskManager();
