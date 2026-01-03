// =====================================================
// Utilidades de Formateo
// =====================================================

import type { ArbitrageOpportunity, TradeExecution, TradeStats } from '@polyarbitrage/types';

/**
 * Formatea un número como moneda USD
 */
export function formatUSD(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Formatea un porcentaje
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Formatea una dirección de wallet (abreviada)
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Formatea un timestamp como fecha/hora legible
 */
export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(timestamp));
}

/**
 * Formatea duración en formato legible
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Formatea una oportunidad de arbitraje para mostrar en Telegram
 */
export function formatOpportunityMessage(opp: ArbitrageOpportunity): string {
  const emoji = opp.confidence === 'HIGH' ? '🟢' : opp.confidence === 'MEDIUM' ? '🟡' : '🔴';
  const typeEmoji = opp.type === 'BUY_BOTH' ? '📈' : '📉';
  
  return `
${emoji} *Oportunidad de Arbitraje* ${typeEmoji}

📊 *Mercado:* ${escapeMarkdown(opp.marketQuestion.slice(0, 50))}...

💰 *Precios:*
• YES: ${opp.yesPrice.toFixed(4)}
• NO: ${opp.noPrice.toFixed(4)}
• Total: ${opp.totalPrice.toFixed(4)}

📈 *Beneficio:* ${formatPercentage(opp.profitPercentage)}
💵 *Beneficio estimado:* ${formatUSD(opp.estimatedProfit)}
🎯 *Inversión máx:* ${formatUSD(opp.maxInvestment)}

⚡ *Confianza:* ${opp.confidence}
⏰ *Expira en:* ${formatDuration(opp.expiresAt - Date.now())}
`.trim();
}

/**
 * Formatea un trade ejecutado para mostrar en Telegram
 */
export function formatTradeMessage(trade: TradeExecution): string {
  const statusEmoji = {
    PENDING: '⏳',
    SUBMITTED: '📤',
    CONFIRMED: '✅',
    FAILED: '❌',
    CANCELLED: '🚫',
  }[trade.status];
  
  const sideEmoji = trade.side === 'BUY' ? '🟢' : '🔴';
  
  return `
${statusEmoji} *Trade ${trade.status}*

${sideEmoji} ${trade.side} ${trade.outcome}
💵 Cantidad: ${formatUSD(trade.amount)}
💰 Precio: ${trade.executedPrice.toFixed(4)}
📉 Slippage: ${formatPercentage(trade.slippage * 100)}

${trade.txHash ? `🔗 [Ver transacción](https://polygonscan.com/tx/${trade.txHash})` : ''}
${trade.error ? `❌ Error: ${trade.error}` : ''}
`.trim();
}

/**
 * Formatea estadísticas de trading
 */
export function formatStatsMessage(stats: TradeStats): string {
  return `
📊 *Estadísticas de Trading* (${stats.period})

📈 *Resumen:*
• Trades totales: ${stats.totalTrades}
• Exitosos: ${stats.successfulTrades}
• Fallidos: ${stats.failedTrades}
• Win rate: ${(stats.winRate * 100).toFixed(1)}%

💰 *P&L:*
• Ganancias: ${formatUSD(stats.totalProfit)}
• Pérdidas: ${formatUSD(stats.totalLoss)}
• Neto: ${formatUSD(stats.netPnL)}

📉 *Detalles:*
• Volumen total: ${formatUSD(stats.totalVolume)}
• Trade promedio: ${formatUSD(stats.averageTradeSize)}
• Mejor trade: ${formatUSD(stats.bestTrade)}
• Peor trade: ${formatUSD(stats.worstTrade)}
`.trim();
}

/**
 * Escapa caracteres especiales de Markdown para Telegram
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Formatea número grande con sufijos (K, M, B)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
}

/**
 * Genera barra de progreso visual
 */
export function generateProgressBar(
  current: number,
  max: number,
  length: number = 10
): string {
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}
