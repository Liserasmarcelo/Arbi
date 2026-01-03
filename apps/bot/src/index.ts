// =====================================================
// PolyArbitrage Telegram Bot
// =====================================================

import { Bot, Context, session, SessionFlavor, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';
import { config } from './config.js';
import { setupCommands } from './commands/index.js';
import { ArbitrageNotifier } from './services/notifier.js';
import { logger } from './utils/logger.js';

dotenv.config();

// Tipos de sesión
interface SessionData {
  walletAddress?: string;
  settings: {
    notifications: boolean;
    minProfitAlert: number;
    autoExecute: boolean;
  };
  lastArbitrageCheck?: number;
}

type MyContext = Context & SessionFlavor<SessionData>;

// Crear bot
const bot = new Bot<MyContext>(config.telegramBotToken);

// Middleware de sesión
bot.use(session({
  initial: (): SessionData => ({
    settings: {
      notifications: true,
      minProfitAlert: 1.0,
      autoExecute: false,
    },
  }),
}));

// Middleware de logging
bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`Update processed in ${ms}ms`, {
    userId: ctx.from?.id,
    type: ctx.updateType,
  });
});

// Configurar comandos
setupCommands(bot);

// Manejador de errores
bot.catch((err) => {
  logger.error('Bot error', err);
});

// Callback queries para botones inline
bot.callbackQuery(/^arb_execute_(.+)$/, async (ctx) => {
  const opportunityId = ctx.match[1];
  
  await ctx.answerCallbackQuery({
    text: 'Redirigiendo a la app para ejecutar...',
  });
  
  // Abrir WebApp para ejecutar
  const webAppUrl = `${config.webAppUrl}?action=execute&id=${opportunityId}`;
  await ctx.reply(`🔗 Abre la aplicación para ejecutar este trade:\n\n${webAppUrl}`);
});

bot.callbackQuery(/^settings_(.+)$/, async (ctx) => {
  const setting = ctx.match[1];
  
  switch (setting) {
    case 'notifications':
      ctx.session.settings.notifications = !ctx.session.settings.notifications;
      await ctx.answerCallbackQuery({
        text: ctx.session.settings.notifications 
          ? '🔔 Notificaciones activadas' 
          : '🔕 Notificaciones desactivadas',
      });
      break;
      
    case 'autoexecute':
      ctx.session.settings.autoExecute = !ctx.session.settings.autoExecute;
      await ctx.answerCallbackQuery({
        text: ctx.session.settings.autoExecute 
          ? '⚡ Auto-ejecución activada' 
          : '✋ Auto-ejecución desactivada',
      });
      break;
  }
  
  // Actualizar mensaje con nuevo estado
  await updateSettingsMessage(ctx);
});

async function updateSettingsMessage(ctx: MyContext) {
  const keyboard = new InlineKeyboard()
    .text(
      ctx.session.settings.notifications ? '🔔 Notificaciones: ON' : '🔕 Notificaciones: OFF',
      'settings_notifications'
    )
    .row()
    .text(
      ctx.session.settings.autoExecute ? '⚡ Auto-ejecución: ON' : '✋ Auto-ejecución: OFF',
      'settings_autoexecute'
    );

  await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
}

// Iniciar notificador de arbitraje
const notifier = new ArbitrageNotifier(bot);

// Iniciar bot
async function start() {
  logger.info('Starting PolyArbitrage Bot...');
  
  // Configurar comandos en BotFather
  await bot.api.setMyCommands([
    { command: 'start', description: 'Iniciar la aplicación' },
    { command: 'arbitraje', description: 'Buscar oportunidades de arbitraje' },
    { command: 'wallet', description: 'Conectar/desconectar wallet' },
    { command: 'historial', description: 'Ver historial de operaciones' },
    { command: 'config', description: 'Configurar preferencias' },
    { command: 'help', description: 'Mostrar ayuda' },
    { command: 'legal', description: 'Información legal y disclaimer' },
  ]);
  
  // Iniciar notificador
  await notifier.start();
  
  // Iniciar bot
  await bot.start({
    onStart: (botInfo) => {
      logger.info(`Bot started as @${botInfo.username}`);
    },
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, stopping bot...');
  await notifier.stop();
  await bot.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, stopping bot...');
  await notifier.stop();
  await bot.stop();
  process.exit(0);
});

start().catch((error) => {
  logger.error('Failed to start bot', error);
  process.exit(1);
});

export { bot, MyContext };
