/**
 * WebSocket React Hook
 * Issue #29: WebSocket Edge Cases - React integration
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  WebSocketConnectionManager,
  ConnectionStatus,
  WebSocketMessage
} from '@/lib/websocket/connection-manager';
import { logger } from '@/lib/security/productionLogger';

interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  send: (type: string, payload: any) => void;
  connect: () => void;
  disconnect: () => void;
  queuedMessages: number;
  isConnected: boolean;
  isReconnecting: boolean;
}

/**
 * React Hook for WebSocket connection management
 *
 * @example
 * ```tsx
 * const { status, send, isConnected } = useWebSocket({
 *   url: '/api/websocket',
 *   autoConnect: true,
 *   onMessage: (message) => {
 *     console.log('Received:', message);
 *   }
 * });
 *
 * // Send a message
 * send('chat', { text: 'Hello!' });
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { url, autoConnect = true, onMessage, onStatusChange } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [queuedMessages, setQueuedMessages] = useState(0);

  const managerRef = useRef<WebSocketConnectionManager | null>(null);
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onStatusChangeRef.current = onStatusChange;
  }, [onMessage, onStatusChange]);

  // Initialize connection manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new WebSocketConnectionManager({ url });

      // Subscribe to status changes
      const unsubscribeStatus = managerRef.current.onStatusChange((newStatus) => {
        setStatus(newStatus);
        onStatusChangeRef.current?.(newStatus);

        // Update queued message count
        if (managerRef.current) {
          setQueuedMessages(managerRef.current.getQueuedMessageCount());
        }
      });

      // Subscribe to messages
      const unsubscribeMessages = managerRef.current.onMessage((message) => {
        onMessageRef.current?.(message);
      });

      // Auto-connect if enabled
      if (autoConnect) {
        managerRef.current.connect();
      }

      // Cleanup on unmount
      return () => {
        unsubscribeStatus();
        unsubscribeMessages();
        managerRef.current?.disconnect();
        managerRef.current = null;
      };
    }
  }, [url, autoConnect]);

  // Update queued messages count periodically
  useEffect(() => {
    if (status !== 'connected') {
      const interval = setInterval(() => {
        if (managerRef.current) {
          setQueuedMessages(managerRef.current.getQueuedMessageCount());
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status]);

  const send = useCallback((type: string, payload: any) => {
    if (!managerRef.current) {
      logger.error('WebSocket manager not initialized', undefined, {
        component: 'useWebSocket'
      });
      return;
    }

    managerRef.current.send(type, payload);
  }, []);

  const connect = useCallback(() => {
    if (!managerRef.current) {
      logger.error('WebSocket manager not initialized', undefined, {
        component: 'useWebSocket'
      });
      return;
    }

    managerRef.current.connect();
  }, []);

  const disconnect = useCallback(() => {
    if (!managerRef.current) {
      logger.error('WebSocket manager not initialized', undefined, {
        component: 'useWebSocket'
      });
      return;
    }

    managerRef.current.disconnect();
  }, []);

  return {
    status,
    send,
    connect,
    disconnect,
    queuedMessages,
    isConnected: status === 'connected',
    isReconnecting: status === 'reconnecting'
  };
}

/**
 * Hook for subscribing to specific message types
 *
 * @example
 * ```tsx
 * useWebSocketSubscribe('chat', (message) => {
 *   console.log('Chat message:', message.payload);
 * });
 * ```
 */
export function useWebSocketSubscribe(
  messageType: string,
  handler: (message: WebSocketMessage) => void
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      if (message.type === messageType) {
        handlerRef.current(message);
      }
    };

    // This would need to be connected to the actual WebSocket manager
    // For now, it's a placeholder
    logger.debug('WebSocket subscription registered', undefined, {
      component: 'useWebSocketSubscribe',
      messageType
    });

    return () => {
      logger.debug('WebSocket subscription unregistered', undefined, {
        component: 'useWebSocketSubscribe',
        messageType
      });
    };
  }, [messageType]);
}

/**
 * Hook for connection status
 *
 * @example
 * ```tsx
 * const { isOnline, isReconnecting } = useConnectionStatus();
 *
 * if (isReconnecting) {
 *   return <div>Reconnecting...</div>;
 * }
 * ```
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    // This would subscribe to the global connection manager
    // For now, it's a placeholder
    const updateStatus = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
    };

    // Simulated subscription
    return () => {
      // Cleanup
    };
  }, []);

  return {
    status,
    isOnline: status === 'connected',
    isOffline: status === 'disconnected',
    isReconnecting: status === 'reconnecting',
    hasError: status === 'error'
  };
}
