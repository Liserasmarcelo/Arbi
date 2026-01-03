// =====================================================
// Bot Commands Setup
// =====================================================

import { Bot, InlineKeyboard } from 'grammy';
import type { MyContext } from '../index.js';
import { config } from '../config.js';
import { formatOpportunityMessage, formatUSD, formatPercentage } from '@polyarbitrage/utils';
import { PolymarketClient } from '@polyarbitrage/polymarket-client';
import { logger } from '../utils/logger.js';

const client = new PolymarketClient({ baseUrl: config.polymarket.clobApi });

export function setupCommands(bot: Bot<MyContext>) {
  // /start - Iniciar aplicación
  bot.command('start', async (ctx) => {
    const webAppUrl = config.webAppUrl;
    
    const keyboard = new InlineKeyboard()
      .webApp('🚀 Abrir Aplicación', webAppUrl)
      .row()
      .text('📊 Ver Oportunidades', 'show_opportunities')
      .row()
      .text('⚙️ Configuración', 'show_settings');
    
    await ctx.reply(
      `¡Bienvenido a *PolyArbitrage Bot*! 🎯\n\n` +
      `Detecta y ejecuta oportunidades de arbitraje en Polymarket de forma automática.\n\n` +
      `*¿Cómo funciona?*\n` +
      `• Escaneamos mercados en busca de discrepancias de precios\n` +
      `• Cuando YES + NO ≠ 1.00, hay oportunidad de ganancia\n` +
      `• Ejecuta trades directamente desde Telegram\n\n` +
      `*Comandos disponibles:*\n` +
      `/arbitraje - Buscar oportunidades\n` +
      `/wallet - Conectar wallet\n` +
      `/historial - Ver operaciones\n` +
      `/config - Preferencias\n` +
      `/help - Ayuda\n` +
      `/legal - Información legal\n\n` +
      `¡Haz clic en "Abrir Aplicación" para comenzar!`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // /arbitraje - Buscar oportunidades
  bot.command('arbitraje', async (ctx) => {
    await ctx.reply('🔍 Buscando oportunidades de arbitraje...');
    
    try {
      // Obtener mercados y buscar oportunidades
      const markets = await client.getMarkets();
      const opportunities = [];
      
      for (const market of markets.slice(0, 20)) { // Limitar para velocidad
        if (!market.active || market.closed) continue;
        
        try {
          const prices = await client.getMarketPrices(market);
          
          if (prices.arbitrageOpportunity && prices.profitPercentage >= config.arbitrage.minProfitPercentage) {
            opportunities.push({
              market,
              prices,
            });
          }
        } catch (e) {
          // Ignorar errores individuales
        }
      }
      
      if (opportunities.length === 0) {
        await ctx.reply(
          '😔 No hay oportunidades de arbitraje en este momento.\n\n' +
          'Las oportunidades son muy efímeras y dependen de las condiciones del mercado.\n' +
          'Activa las notificaciones para recibir alertas cuando surjan.',
          {
            reply_markup: new InlineKeyboard()
              .text('🔔 Activar Notificaciones', 'settings_notifications'),
          }
        );
        return;
      }
      
      // Mostrar oportunidades
      const topOpportunities = opportunities
        .sort((a, b) => b.prices.profitPercentage - a.prices.profitPercentage)
        .slice(0, config.arbitrage.maxOpportunitiesPerMessage);
      
      for (const opp of topOpportunities) {
        const type = opp.prices.totalPrice < 1 ? 'Comprar ambas' : 'Vender ambas';
        const emoji = opp.prices.profitPercentage >= 2 ? '🟢' : opp.prices.profitPercentage >= 1 ? '🟡' : '🔴';
        
        const message = 
          `${emoji} *Oportunidad de Arbitraje*\n\n` +
          `📊 *Mercado:*\n${opp.market.question.slice(0, 100)}...\n\n` +
          `💰 *Precios:*\n` +
          `• YES: ${opp.prices.yes.price.toFixed(4)}\n` +
          `• NO: ${opp.prices.no.price.toFixed(4)}\n` +
          `• Total: ${opp.prices.totalPrice.toFixed(4)}\n\n` +
          `📈 *Beneficio:* ${formatPercentage(opp.prices.profitPercentage)}\n` +
          `🎯 *Estrategia:* ${type}\n\n` +
          `⚠️ _Las oportunidades pueden desaparecer rápidamente_`;
        
        const keyboard = new InlineKeyboard()
          .webApp('⚡ Ejecutar Trade', `${config.webAppUrl}?market=${opp.market.condition_id}`);
        
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
      
      await ctx.reply(
        `✅ Se encontraron ${opportunities.length} oportunidades.\n` +
        `Mostrando las ${topOpportunities.length} mejores.`
      );
      
    } catch (error) {
      logger.error('Error scanning for opportunities', error);
      await ctx.reply(
        '❌ Error al buscar oportunidades. Por favor, intenta de nuevo más tarde.'
      );
    }
  });

  // /wallet - Conectar wallet
  bot.command('wallet', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .webApp('👛 Conectar Wallet', `${config.webAppUrl}?page=wallet`);
    
    if (ctx.session.walletAddress) {
      const address = ctx.session.walletAddress;
      await ctx.reply(
        `👛 *Wallet Conectada*\n\n` +
        `Dirección: \`${address.slice(0, 6)}...${address.slice(-4)}\`\n\n` +
        `Usa el botón para gestionar tu wallet.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .webApp('⚙️ Gestionar Wallet', `${config.webAppUrl}?page=wallet`)
            .row()
            .text('🔌 Desconectar', 'disconnect_wallet'),
        }
      );
    } else {
      await ctx.reply(
        `👛 *Conecta tu Wallet*\n\n` +
        `Para ejecutar trades necesitas conectar una wallet compatible con Polygon.\n\n` +
        `*Wallets soportadas:*\n` +
        `• MetaMask\n` +
        `• WalletConnect\n` +
        `• Coinbase Wallet\n\n` +
        `Haz clic en el botón para conectar de forma segura.`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        }
      );
    }
  });

  // /historial - Ver operaciones
  bot.command('historial', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .webApp('📜 Ver Historial Completo', `${config.webAppUrl}?page=history`);
    
    // En producción, obtener del API
    await ctx.reply(
      `📜 *Historial de Operaciones*\n\n` +
      `Para ver el historial completo de tus trades, abre la aplicación.\n\n` +
      `*Resumen:*\n` +
      `• Trades hoy: 0\n` +
      `• P&L hoy: $0.00\n` +
      `• Win rate: --\n\n` +
      `_Conecta tu wallet para ver tu historial._`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // /config - Configuración
  bot.command('config', async (ctx) => {
    const settings = ctx.session.settings;
    
    const keyboard = new InlineKeyboard()
      .text(
        settings.notifications ? '🔔 Notificaciones: ON' : '🔕 Notificaciones: OFF',
        'settings_notifications'
      )
      .row()
      .text(
        settings.autoExecute ? '⚡ Auto-ejecución: ON' : '✋ Auto-ejecución: OFF',
        'settings_autoexecute'
      )
      .row()
      .webApp('⚙️ Más Opciones', `${config.webAppUrl}?page=settings`);
    
    await ctx.reply(
      `⚙️ *Configuración*\n\n` +
      `Personaliza tu experiencia con PolyArbitrage.\n\n` +
      `*Configuración actual:*\n` +
      `• Notificaciones: ${settings.notifications ? 'Activadas' : 'Desactivadas'}\n` +
      `• Alerta mínima: ${settings.minProfitAlert}%\n` +
      `• Auto-ejecución: ${settings.autoExecute ? 'Activada' : 'Desactivada'}\n\n` +
      `_Toca los botones para cambiar la configuración._`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // /help - Ayuda
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `❓ *Ayuda - PolyArbitrage Bot*\n\n` +
      `*¿Qué es el arbitraje?*\n` +
      `El arbitraje en mercados de predicción ocurre cuando la suma de precios YES + NO ≠ 1.00. ` +
      `Esto permite comprar o vender ambas posiciones para garantizar ganancias.\n\n` +
      `*Ejemplo:*\n` +
      `• YES = 0.40, NO = 0.58 → Total = 0.98\n` +
      `• Compras ambas por $0.98\n` +
      `• Al vencimiento, una vale $1.00\n` +
      `• Ganancia: $0.02 (2.04%)\n\n` +
      `*Comandos:*\n` +
      `/start - Iniciar bot\n` +
      `/arbitraje - Buscar oportunidades\n` +
      `/wallet - Gestionar wallet\n` +
      `/historial - Ver trades\n` +
      `/config - Ajustes\n` +
      `/legal - Disclaimer\n\n` +
      `*Soporte:*\n` +
      `¿Problemas? Contacta al equipo de soporte.`,
      { parse_mode: 'Markdown' }
    );
  });

  // /legal - Información legal
  bot.command('legal', async (ctx) => {
    await ctx.reply(
      `⚖️ *Información Legal y Disclaimer*\n\n` +
      `*ADVERTENCIA DE RIESGO:*\n` +
      `El trading de arbitraje en mercados de predicción conlleva riesgos significativos, incluyendo:\n\n` +
      `• Pérdida parcial o total del capital invertido\n` +
      `• Riesgo tecnológico (bugs, hacks, fallos de sistema)\n` +
      `• Riesgo de liquidez\n` +
      `• Cambios regulatorios\n` +
      `• Costes de gas que pueden eliminar beneficios\n\n` +
      `*NO GARANTIZAMOS GANANCIAS.*\n\n` +
      `*JURISDICCIONES RESTRINGIDAS:*\n` +
      `Este servicio NO está disponible para residentes de:\n` +
      `🇺🇸 Estados Unidos\n` +
      `🇨🇦 Canadá\n` +
      `🇨🇳 China\n` +
      `🇮🇷 Irán\n` +
      `🇰🇵 Corea del Norte\n` +
      `🇸🇾 Siria\n` +
      `🇨🇺 Cuba\n\n` +
      `*AL USAR ESTE BOT:*\n` +
      `• Confirmas que eres mayor de 18 años\n` +
      `• Aceptas todos los riesgos\n` +
      `• Confirmas que cumples con las leyes locales\n` +
      `• Entiendes que no proporcionamos asesoría financiera\n\n` +
      `_Consulta con un profesional financiero antes de invertir._`,
      { parse_mode: 'Markdown' }
    );
  });

  // Callback: Desconectar wallet
  bot.callbackQuery('disconnect_wallet', async (ctx) => {
    ctx.session.walletAddress = undefined;
    await ctx.answerCallbackQuery({ text: '✅ Wallet desconectada' });
    await ctx.editMessageText(
      '👛 Wallet desconectada correctamente.\n\nUsa /wallet para conectar una nueva.'
    );
  });

  // Callback: Mostrar oportunidades
  bot.callbackQuery('show_opportunities', async (ctx) => {
    await ctx.answerCallbackQuery();
    // Simular comando /arbitraje
    await ctx.reply('🔍 Buscando oportunidades de arbitraje...');
    // Aquí podrías llamar a la misma lógica del comando /arbitraje
  });

  // Callback: Mostrar settings
  bot.callbackQuery('show_settings', async (ctx) => {
    await ctx.answerCallbackQuery();
    const settings = ctx.session.settings;
    
    const keyboard = new InlineKeyboard()
      .text(
        settings.notifications ? '🔔 Notificaciones: ON' : '🔕 Notificaciones: OFF',
        'settings_notifications'
      )
      .row()
      .text(
        settings.autoExecute ? '⚡ Auto-ejecución: ON' : '✋ Auto-ejecución: OFF',
        'settings_autoexecute'
      );
    
    await ctx.reply('⚙️ *Configuración*\n\nToca para cambiar:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });
}
