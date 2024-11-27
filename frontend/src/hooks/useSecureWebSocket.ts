import { useEffect, useCallback, useRef } from 'react';
import { WebSocketMessageType, WebSocketMessage, createWebSocketMessage } from '../types/websocket';
import { securityUtils } from '../utils/security';

interface UseSecureWebSocketOptions {
  url: string;
  encryptionKey: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useSecureWebSocket = ({
  url,
  encryptionKey,
  onMessage,
  onError,
  onConnect,
  onDisconnect,
}: UseSecureWebSocketOptions) => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        onConnect?.();
      };

      ws.current.onclose = () => {
        onDisconnect?.();
        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (event) => {
        onError?.(new Error('WebSocket error occurred'));
      };

      ws.current.onmessage = (event) => {
        try {
          const decryptedData = securityUtils.decrypt(event.data, encryptionKey);
          const message: WebSocketMessage = JSON.parse(decryptedData);
          onMessage?.(message);
        } catch (error) {
          onError?.(new Error('Failed to process message'));
        }
      };
    } catch (error) {
      onError?.(new Error('Failed to establish WebSocket connection'));
    }
  }, [url, encryptionKey, onConnect, onDisconnect, onMessage, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
    }
  }, []);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          const encryptedData = securityUtils.encrypt(
            JSON.stringify(message),
            encryptionKey
          );
          ws.current.send(encryptedData);
        } catch (error) {
          onError?.(new Error('Failed to send message'));
        }
      } else {
        onError?.(new Error('WebSocket is not connected'));
      }
    },
    [encryptionKey, onError]
  );

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    sendMessage,
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
};

export { WebSocketMessageType, createWebSocketMessage };
