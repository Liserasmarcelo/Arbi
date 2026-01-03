// =====================================================
// Utilidades de Arbitraje
// =====================================================

import type {
  ArbitrageOpportunity,
  ArbitrageType,
  ArbitrageConfidence,
  PriceData,
  ArbitrageConfig,
} from '@polyarbitrage/types';

/**
 * Calcula si existe una oportunidad de arbitraje
 * @param priceData Datos de precios del mercado
 * @param config Configuración de arbitraje
 * @returns Oportunidad de arbitraje o null si no existe
 */
export function calculateArbitrageOpportunity(
  priceData: PriceData,
  config: ArbitrageConfig,
  marketQuestion: string = ''
): ArbitrageOpportunity | null {
  const { yesPrice, noPrice, marketId, timestamp } = priceData;
  
  // Calcular la suma total de precios
  const totalPrice = yesPrice + noPrice;
  
  // Verificar si hay oportunidad de arbitraje
  // Tipo 1: YES + NO < 1.00 → Comprar ambas
  // Tipo 2: YES + NO > 1.00 → Vender ambas
  
  const isBuyBoth = totalPrice < 1.0;
  const isSellBoth = totalPrice > 1.0;
  
  if (!isBuyBoth && !isSellBoth) {
    return null;
  }
  
  // Calcular beneficio potencial
  const profitAbsolute = isBuyBoth ? (1.0 - totalPrice) : (totalPrice - 1.0);
  const profitPercentage = (profitAbsolute / totalPrice) * 100;
  
  // Verificar umbral mínimo
  if (profitPercentage < config.minProfitPercentage) {
    return null;
  }
  
  // Calcular inversión máxima y beneficio estimado
  const maxInvestment = Math.min(config.maxPositionSizeUsd, 100); // Limitado a $100
  const estimatedProfit = maxInvestment * (profitPercentage / 100);
  
  // Determinar confianza basada en el porcentaje de beneficio
  const confidence = determineConfidence(profitPercentage, config);
  
  // Crear oportunidad
  const opportunity: ArbitrageOpportunity = {
    id: generateOpportunityId(marketId, timestamp),
    marketId,
    marketQuestion,
    type: isBuyBoth ? 'BUY_BOTH' : 'SELL_BOTH',
    yesPrice,
    noPrice,
    totalPrice,
    profitPercentage,
    profitAbsolute,
    maxInvestment,
    estimatedProfit,
    timestamp,
    expiresAt: timestamp + 30000, // Expira en 30 segundos
    confidence,
  };
  
  return opportunity;
}

/**
 * Determina el nivel de confianza de una oportunidad
 */
function determineConfidence(
  profitPercentage: number,
  config: ArbitrageConfig
): ArbitrageConfidence {
  // Alta confianza: beneficio > 2%
  if (profitPercentage >= 2.0) {
    return 'HIGH';
  }
  
  // Media confianza: beneficio entre 1% y 2%
  if (profitPercentage >= 1.0) {
    return 'MEDIUM';
  }
  
  // Baja confianza: beneficio < 1%
  return 'LOW';
}

/**
 * Genera un ID único para la oportunidad
 */
function generateOpportunityId(marketId: string, timestamp: number): string {
  return `arb_${marketId.slice(0, 8)}_${timestamp}`;
}

/**
 * Calcula el slippage esperado basado en la liquidez
 */
export function calculateExpectedSlippage(
  orderSize: number,
  availableLiquidity: number
): number {
  if (availableLiquidity <= 0) return 1; // 100% slippage si no hay liquidez
  
  // Modelo simple: slippage aumenta cuadráticamente con el tamaño de la orden
  const ratio = orderSize / availableLiquidity;
  const slippage = Math.min(ratio * ratio, 1); // Máximo 100%
  
  return slippage;
}

/**
 * Verifica si la oportunidad sigue siendo válida
 */
export function isOpportunityValid(
  opportunity: ArbitrageOpportunity,
  currentPriceData: PriceData,
  config: ArbitrageConfig
): boolean {
  const now = Date.now();
  
  // Verificar expiración
  if (now > opportunity.expiresAt) {
    return false;
  }
  
  // Recalcular con precios actuales
  const newOpportunity = calculateArbitrageOpportunity(
    currentPriceData,
    config,
    opportunity.marketQuestion
  );
  
  // Si no hay oportunidad o es de tipo diferente, no es válida
  if (!newOpportunity || newOpportunity.type !== opportunity.type) {
    return false;
  }
  
  // Verificar que el beneficio sigue siendo suficiente
  if (newOpportunity.profitPercentage < config.minProfitPercentage) {
    return false;
  }
  
  return true;
}

/**
 * Calcula el tamaño óptimo de la posición
 */
export function calculateOptimalPositionSize(
  opportunity: ArbitrageOpportunity,
  availableBalance: number,
  config: ArbitrageConfig
): number {
  // No invertir más de lo disponible
  let size = Math.min(availableBalance, config.maxPositionSizeUsd);
  
  // Reducir tamaño para oportunidades de baja confianza
  if (opportunity.confidence === 'LOW') {
    size *= 0.5;
  } else if (opportunity.confidence === 'MEDIUM') {
    size *= 0.75;
  }
  
  // Asegurar un mínimo razonable
  const minTradeSize = 5; // $5 mínimo
  if (size < minTradeSize) {
    return 0; // No vale la pena con gas fees
  }
  
  return size;
}

/**
 * Calcula el beneficio neto considerando gas
 */
export function calculateNetProfit(
  grossProfit: number,
  gasCostUsd: number
): number {
  return grossProfit - gasCostUsd;
}

/**
 * Verifica si el trade es rentable después de gas
 */
export function isProfitableAfterGas(
  opportunity: ArbitrageOpportunity,
  estimatedGasCostUsd: number
): boolean {
  return opportunity.estimatedProfit > estimatedGasCostUsd * 1.5; // 50% margen de seguridad
}
