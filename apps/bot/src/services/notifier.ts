// =====================================================
// Arbitrage Notifier Service
// =====================================================

import { Bot } from 'grammy';
import { PolymarketClient, PolymarketWebSocket } from '@polyarbitrage/polymarket-client';
import type { ArbitrageOpportunity } from '@polyarbitrage/types';
import { calculateArbitrageOpportunity } from '@polyarbitrage/utils';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

// Store de suscriptores (en producción usar Redis)
const subscribers = new Set<number>();

export class ArbitrageNotifier {
  private bot: Bot;
  private client: PolymarketClient;
  private ws: PolymarketWebSocket;
  private scanInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastNotifiedOpportunities: Map<string, number> = new Map();
  private notificationCooldown = 60000; // 1 minuto entre notificaciones del mismo mercado

  constructor(bot: Bot) {
    this.bot = bot;
    this.client = new PolymarketClient({ baseUrl: config.polymarket.clobApi });
    this.ws = new PolymarketWebSocket({ url: config.polymarket.wsUrl });
  }

  /**
   * Inicia el notificador
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    logger.info('Starting arbitrage notifier...');
    this.isRunning = true;

    // Conectar WebSocket para actualizaciones en tiempo real
    try {
      await this.ws.connect();
      this.setupWebSocketHandlers();
    } catch (error) {
      logger.warn('WebSocket connection failed, falling back to polling', error);
    }

    // Escaneo periódico
    this.scanInterval = setInterval(async () => {
      await this.scanForOpportunities();
    }, config.arbitrage.scanIntervalMs);

    logger.info('Arbitrage notifier started');
  }

  /**
   * Detiene el notificador
   */
  async stop(): Promise<void> {
    logger.info('Stopping arbitrage notifier...');
    this.isRunning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this.ws.disconnect();
    logger.info('Arbitrage notifier stopped');
  }

  /**
   * Añade un suscriptor
   */
  subscribe(chatId: number): void {
    subscribers.add(chatId);
    logger.info(`User ${chatId} subscribed to notifications`);
  }

  /**
   * Elimina un suscriptor
   */
  unsubscribe(chatId: number): void {
    subscribers.delete(chatId);
    logger.info(`User ${chatId} unsubscribed from notifications`);
  }

  /**
   * Configura handlers del WebSocket
   */
  private setupWebSocketHandlers(): void {
    this.ws.on('priceUpdate', async (update) => {
      // Procesar actualizaciones de precios en tiempo real
      // Esto permite detectar oportunidades más rápido
    });
  }

  /**
   * Escanea mercados en busca de oportunidades
   */
  private async scanForOpportunities(): Promise<void> {
    if (!this.isRunning || subscribers.size === 0) return;

    try {
      const markets = await this.client.getMarkets();
      
      for (const market of markets) {
        if (!market.active || market.closed) continue;

        try {
          const prices = await this.client.getMarketPrices(market);
          
          if (prices.arbitrageOpportunity && prices.profitPercentage >= config.arbitrage.minProfitPercentage) {
            await this.notifyOpportunity(market, prices);
          }
        } catch (e) {
          // Ignorar errores individuales de mercados
        }
      }
    } catch (error) {
      logger.error('Error scanning for opportunities', error);
    }
  }

  /**
   * Notifica una oportunidad a los suscriptores
   */
  private async notifyOpportunity(market: any, prices: any): Promise<void> {
    const marketId = market.condition_id;
    const now = Date.now();
    
    // Verificar cooldown
    const lastNotified = this.lastNotifiedOpportunities.get(marketId);
    if (lastNotified && now - lastNotified < this.notificationCooldown) {
      return; // Aún en cooldown
    }

    this.lastNotifiedOpportunities.set(marketId, now);

    // Construir mensaje
    const emoji = prices.profitPercentage >= 2 ? '🟢' : prices.profitPercentage >= 1 ? '🟡' : '🔴';
    const type = prices.totalPrice < 1 ? 'BUY_BOTH' : 'SELL_BOTH';
    
    const message = 
      `${emoji} *¡Oportunidad de Arbitraje!*\n\n` +
      `📊 ${market.question.slice(0, 80)}...\n\n` +
      `💰 YES: ${prices.yes.price.toFixed(4)} | NO: ${prices.no.price.toFixed(4)}\n` +
      `📈 Total: ${prices.totalPrice.toFixed(4)} (${type === 'BUY_BOTH' ? 'Comprar' : 'Vender'})\n` +
      `💵 Beneficio: *${prices.profitPercentage.toFixed(2)}%*\n\n` +
      `⚡ _¡Actúa rápido, las oportunidades desaparecen!_`;

    // Enviar a todos los suscriptores
    for (const chatId of subscribers) {
      try {
        await this.bot.api.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              {
                text: '⚡ Ejecutar',
                web_app: { url: `${config.webAppUrl}?market=${marketId}&action=execute` },
              },
            ]],
          },
        });
      } catch (error) {
        // Si falla el envío, puede que el usuario haya bloqueado el bot
        if ((error as any)?.error_code === 403) {
          subscribers.delete(chatId);
          logger.info(`Removed blocked user ${chatId} from subscribers`);
        } else {
          logger.error(`Failed to send notification to ${chatId}`, error);
        }
      }
    }

    logger.info(`Notified ${subscribers.size} users about opportunity`, {
      marketId,
      profitPercentage: prices.profitPercentage,
    });
  }

  /**
   * Limpiar oportunidades antiguas del cooldown
   */
  private cleanupOldOpportunities(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutos

    for (const [marketId, timestamp] of this.lastNotifiedOpportunities) {
      if (now - timestamp > maxAge) {
        this.lastNotifiedOpportunities.delete(marketId);
      }
    }
  }
}
