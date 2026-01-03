// =====================================================
// Utilidades de Validación
// =====================================================

import { ethers } from 'ethers';
import type { ArbitrageConfig, RiskLimits, UserSettings } from '@polyarbitrage/types';

/**
 * Valida una dirección Ethereum
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Valida un hash de transacción
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Valida configuración de arbitraje
 */
export function validateArbitrageConfig(config: Partial<ArbitrageConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.minProfitPercentage !== undefined) {
    if (config.minProfitPercentage < 0.1) {
      errors.push('El beneficio mínimo debe ser al menos 0.1%');
    }
    if (config.minProfitPercentage > 50) {
      errors.push('El beneficio mínimo no puede superar 50%');
    }
  }

  if (config.maxPositionSizeUsd !== undefined) {
    if (config.maxPositionSizeUsd < 1) {
      errors.push('El tamaño máximo de posición debe ser al menos $1');
    }
    if (config.maxPositionSizeUsd > 10000) {
      errors.push('El tamaño máximo de posición no puede superar $10,000');
    }
  }

  if (config.slippageTolerance !== undefined) {
    if (config.slippageTolerance < 0.001) {
      errors.push('La tolerancia de slippage debe ser al menos 0.1%');
    }
    if (config.slippageTolerance > 0.1) {
      errors.push('La tolerancia de slippage no puede superar 10%');
    }
  }

  if (config.maxGasPriceGwei !== undefined) {
    if (config.maxGasPriceGwei < 1) {
      errors.push('El precio máximo de gas debe ser al menos 1 GWEI');
    }
    if (config.maxGasPriceGwei > 500) {
      errors.push('El precio máximo de gas no puede superar 500 GWEI');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida límites de riesgo
 */
export function validateRiskLimits(limits: Partial<RiskLimits>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (limits.maxDailyLoss !== undefined) {
    if (limits.maxDailyLoss < 1) {
      errors.push('El límite de pérdida diaria debe ser al menos $1');
    }
    if (limits.maxDailyLoss > 1000) {
      errors.push('El límite de pérdida diaria no puede superar $1,000');
    }
  }

  if (limits.maxPositionSize !== undefined) {
    if (limits.maxPositionSize < 1) {
      errors.push('El tamaño máximo de posición debe ser al menos $1');
    }
  }

  if (limits.maxConcurrentTrades !== undefined) {
    if (limits.maxConcurrentTrades < 1) {
      errors.push('Debe permitirse al menos 1 trade concurrente');
    }
    if (limits.maxConcurrentTrades > 10) {
      errors.push('No se permiten más de 10 trades concurrentes');
    }
  }

  if (limits.cooldownAfterLoss !== undefined) {
    if (limits.cooldownAfterLoss < 0) {
      errors.push('El cooldown no puede ser negativo');
    }
    if (limits.cooldownAfterLoss > 1440) {
      errors.push('El cooldown no puede superar 24 horas');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida datos de usuario de Telegram WebApp
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string
): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) return false;
    
    // Ordenar parámetros alfabéticamente (excepto hash)
    const params = Array.from(urlParams.entries())
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Calcular HMAC
    const secretKey = ethers.sha256(ethers.toUtf8Bytes(botToken));
    const calculatedHash = ethers.computeHmac('sha256', secretKey, ethers.toUtf8Bytes(params));
    
    return calculatedHash === `0x${hash}`;
  } catch {
    return false;
  }
}

/**
 * Sanitiza entrada de usuario
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Eliminar HTML
    .replace(/[<>'"&]/g, '') // Eliminar caracteres especiales
    .slice(0, 1000); // Limitar longitud
}

/**
 * Valida que un número esté en rango
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que la cantidad sea válida para trading
 */
export function isValidTradeAmount(amount: number): boolean {
  return amount > 0 && amount <= 10000 && Number.isFinite(amount);
}

/**
 * Valida que el precio esté en rango válido (0-1 para mercados de predicción)
 */
export function isValidPrice(price: number): boolean {
  return price >= 0 && price <= 1 && Number.isFinite(price);
}
