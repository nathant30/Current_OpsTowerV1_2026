/**
 * WebSocket Connection Manager
 * Issue #29: WebSocket Edge Cases - Connection management with reconnection logic
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queue during disconnection
 * - Duplicate message handling
 * - Connection status monitoring
 * - Heartbeat/ping-pong mechanism
 */

import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/security/productionLogger';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface WebSocketMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

export interface ConnectionManagerOptions {
  url: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
}

export class WebSocketConnectionManager {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private processedMessageIds: Set<string> = new Set();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private messageListeners: Set<(message: WebSocketMessage) => void> = new Set();

  private readonly options: Required<ConnectionManagerOptions>;

  constructor(options: ConnectionManagerOptions) {
    this.options = {
      url: options.url,
      reconnectDelay: options.reconnectDelay || 1000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      heartbeatInterval: options.heartbeatInterval || 30000,
      messageQueueSize: options.messageQueueSize || 100
    };
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.socket?.connected) {
      logger.warn('WebSocket already connected', undefined, {
        component: 'WebSocketConnectionManager'
      });
      return;
    }

    this.setStatus('reconnecting');

    try {
      this.socket = io(this.options.url, {
        transports: ['websocket'],
        reconnection: false, // We handle reconnection manually
        timeout: 10000
      });

      this.setupEventHandlers();

      logger.info('WebSocket connection initiated', undefined, {
        component: 'WebSocketConnectionManager',
        url: this.options.url
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocket', { error });
      this.handleConnectionError();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.clearTimers();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
    this.messageQueue = [];

    logger.info('WebSocket disconnected', undefined, {
      component: 'WebSocketConnectionManager'
    });
  }

  /**
   * Send message to server
   */
  public send(type: string, payload: any): void {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type,
      payload,
      timestamp: Date.now()
    };

    if (this.status === 'connected' && this.socket?.connected) {
      this.sendMessage(message);
    } else {
      this.queueMessage(message);
      logger.warn('Message queued - WebSocket not connected', undefined, {
        component: 'WebSocketConnectionManager',
        messageType: type
      });
    }
  }

  /**
   * Add status change listener
   */
  public onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    // Return unsubscribe function
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Add message listener
   */
  public onMessage(listener: (message: WebSocketMessage) => void): () => void {
    this.messageListeners.add(listener);
    // Return unsubscribe function
    return () => this.messageListeners.delete(listener);
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get queued message count
   */
  public getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));
    this.socket.on('error', (error) => this.handleError(error));
    this.socket.on('message', (data) => this.handleMessage(data));
    this.socket.on('pong', () => this.handlePong());
  }

  /**
   * Handle successful connection
   */
  private handleConnect(): void {
    this.setStatus('connected');
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
    this.startHeartbeat();
    this.processQueuedMessages();

    logger.info('WebSocket connected successfully', undefined, {
      component: 'WebSocketConnectionManager'
    });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    this.setStatus('disconnected');
    this.clearHeartbeat();

    logger.warn('WebSocket disconnected', undefined, {
      component: 'WebSocketConnectionManager',
      reason
    });

    // Attempt reconnection for non-intentional disconnects
    if (reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  private handleError(error: Error): void {
    this.setStatus('error');

    logger.error('WebSocket error', { error }, {
      component: 'WebSocketConnectionManager'
    });

    this.scheduleReconnect();
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: any): void {
    try {
      const message: WebSocketMessage = {
        id: data.id || this.generateMessageId(),
        type: data.type,
        payload: data.payload,
        timestamp: data.timestamp || Date.now()
      };

      // Check for duplicate messages
      if (this.processedMessageIds.has(message.id)) {
        logger.debug('Duplicate message ignored', undefined, {
          component: 'WebSocketConnectionManager',
          messageId: message.id
        });
        return;
      }

      // Mark message as processed
      this.processedMessageIds.add(message.id);
      this.cleanupProcessedMessages();

      // Notify listeners
      this.messageListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          logger.error('Error in message listener', { error });
        }
      });
    } catch (error) {
      logger.error('Failed to process WebSocket message', { error });
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(): void {
    logger.debug('Heartbeat pong received', undefined, {
      component: 'WebSocketConnectionManager'
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', undefined, {
        component: 'WebSocketConnectionManager',
        attempts: this.reconnectAttempts
      });
      this.setStatus('error');
      return;
    }

    const delay = this.calculateReconnectDelay();
    this.setStatus('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      logger.info('Attempting reconnection', undefined, {
        component: 'WebSocketConnectionManager',
        attempt: this.reconnectAttempts,
        maxAttempts: this.options.maxReconnectAttempts
      });
      this.connect();
    }, delay);
  }

  /**
   * Calculate reconnection delay with exponential backoff
   */
  private calculateReconnectDelay(): number {
    const baseDelay = this.options.reconnectDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    const maxDelay = 30000; // Cap at 30 seconds

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Send message to server
   */
  private sendMessage(message: WebSocketMessage): void {
    if (!this.socket?.connected) return;

    try {
      this.socket.emit('message', message);
      logger.debug('Message sent', undefined, {
        component: 'WebSocketConnectionManager',
        messageType: message.type
      });
    } catch (error) {
      logger.error('Failed to send message', { error });
      this.queueMessage(message);
    }
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.options.messageQueueSize) {
      // Remove oldest message
      this.messageQueue.shift();
      logger.warn('Message queue full, oldest message dropped', undefined, {
        component: 'WebSocketConnectionManager'
      });
    }

    this.messageQueue.push(message);
  }

  /**
   * Process queued messages
   */
  private processQueuedMessages(): void {
    if (this.messageQueue.length === 0) return;

    logger.info('Processing queued messages', undefined, {
      component: 'WebSocketConnectionManager',
      count: this.messageQueue.length
    });

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => this.sendMessage(message));
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        logger.debug('Heartbeat ping sent', undefined, {
          component: 'WebSocketConnectionManager'
        });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearHeartbeat();
    this.clearReconnectTimer();
  }

  /**
   * Update connection status
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;

    this.status = status;

    // Notify listeners
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.error('Error in status listener', { error });
      }
    });

    logger.info('WebSocket status changed', undefined, {
      component: 'WebSocketConnectionManager',
      status
    });
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup old processed message IDs to prevent memory leak
   */
  private cleanupProcessedMessages(): void {
    // Keep only last 1000 message IDs
    if (this.processedMessageIds.size > 1000) {
      const idsArray = Array.from(this.processedMessageIds);
      const toKeep = idsArray.slice(-500);
      this.processedMessageIds = new Set(toKeep);
    }
  }
}

// Singleton instance
let connectionManagerInstance: WebSocketConnectionManager | null = null;

/**
 * Get or create WebSocket connection manager instance
 */
export function getWebSocketManager(url?: string): WebSocketConnectionManager {
  if (!connectionManagerInstance && url) {
    connectionManagerInstance = new WebSocketConnectionManager({ url });
  }

  if (!connectionManagerInstance) {
    throw new Error('WebSocket connection manager not initialized');
  }

  return connectionManagerInstance;
}

/**
 * Reset connection manager (for testing)
 */
export function resetWebSocketManager(): void {
  if (connectionManagerInstance) {
    connectionManagerInstance.disconnect();
    connectionManagerInstance = null;
  }
}
