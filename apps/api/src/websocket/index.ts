// =====================================================
// WebSocket Server
// =====================================================

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { WSMessage } from '@polyarbitrage/types';
import { logger } from '../utils/logger.js';

interface Client {
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastPing: number;
}

class WebSocketServerManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, Client> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Inicializa el servidor WebSocket
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    // Ping interval para mantener conexiones vivas
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);

    logger.info('WebSocket server initialized');
  }

  /**
   * Maneja nueva conexión
   */
  private handleConnection(ws: WebSocket): void {
    const client: Client = {
      ws,
      subscriptions: new Set(),
      lastPing: Date.now(),
    };

    this.clients.set(ws, client);
    logger.info(`Client connected. Total clients: ${this.clients.size}`);

    // Enviar mensaje de bienvenida
    this.send(ws, {
      type: 'SYSTEM_STATUS',
      data: {
        status: 'connected',
        serverTime: Date.now(),
      },
      timestamp: Date.now(),
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Error parsing WebSocket message', error);
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info(`Client disconnected. Total clients: ${this.clients.size}`);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket client error', error);
      this.clients.delete(ws);
    });

    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.lastPing = Date.now();
      }
    });
  }

  /**
   * Maneja mensaje del cliente
   */
  private handleMessage(ws: WebSocket, message: any): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.channels) {
          message.channels.forEach((channel: string) => {
            client.subscriptions.add(channel);
          });
        }
        break;

      case 'unsubscribe':
        if (message.channels) {
          message.channels.forEach((channel: string) => {
            client.subscriptions.delete(channel);
          });
        }
        break;

      case 'authenticate':
        // Verificar token y asociar usuario
        if (message.token) {
          client.userId = message.userId; // En prod, validar JWT
        }
        break;

      case 'ping':
        this.send(ws, {
          type: 'SYSTEM_STATUS',
          data: { pong: true },
          timestamp: Date.now(),
        });
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Envía mensaje a un cliente
   */
  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast a todos los clientes
   */
  broadcast(message: WSMessage): void {
    const data = JSON.stringify(message);
    
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  /**
   * Broadcast a clientes con suscripción específica
   */
  broadcastToChannel(channel: string, message: WSMessage): void {
    const data = JSON.stringify(message);
    
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN && client.subscriptions.has(channel)) {
        ws.send(data);
      }
    }
  }

  /**
   * Envía mensaje a un usuario específico
   */
  sendToUser(userId: string, message: WSMessage): void {
    const data = JSON.stringify(message);
    
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN && client.userId === userId) {
        ws.send(data);
      }
    }
  }

  /**
   * Ping a todos los clientes
   */
  private pingClients(): void {
    const now = Date.now();
    const timeout = 60000; // 1 minuto

    for (const [ws, client] of this.clients) {
      if (now - client.lastPing > timeout) {
        // Cliente no responde, desconectar
        ws.terminate();
        this.clients.delete(ws);
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }
  }

  /**
   * Cierra el servidor
   */
  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    for (const [ws] of this.clients) {
      ws.close();
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }
  }

  /**
   * Obtiene el número de conexiones activas
   */
  getConnectionCount(): number {
    return this.clients.size;
  }
}

export const websocketServer = new WebSocketServerManager();
