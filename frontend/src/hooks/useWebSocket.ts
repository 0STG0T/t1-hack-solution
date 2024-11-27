import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  payload: any;
}

type MessageHandler = (payload: any) => void;

interface WebSocketHook {
  isConnected: boolean;
  error: string | null;
  sendMessage: (message: string | object) => void;
  on: (type: string, handler: MessageHandler) => void;
  off: (type: string, handler: MessageHandler) => void;
  reconnect: () => void;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const RETRY_MULTIPLIER = 1.5;

export const useWebSocket = (url: string): WebSocketHook => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const messageQueue = useRef<string[]>([]);
  const eventHandlers = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const retryDelay = useRef<number>(INITIAL_RETRY_DELAY);

  const connect = useCallback(() => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        return;
      }

      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        retryDelay.current = INITIAL_RETRY_DELAY;
        messageQueue.current.forEach(msg => ws.current?.send(msg));
        messageQueue.current = [];
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        if (!event.wasClean) {
          const delay = Math.min(retryDelay.current * RETRY_MULTIPLIER, MAX_RETRY_DELAY);
          retryDelay.current = delay;
          reconnectTimeout.current = setTimeout(connect, delay);
        }
      };

      ws.current.onerror = (event) => {
        setError('WebSocket connection error');
        console.error('WebSocket error:', event);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (!message.type) {
            console.error('Invalid message format: missing type');
            return;
          }
          const handlers = eventHandlers.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(message.payload);
              } catch (error) {
                console.error(`Error in message handler for type ${message.type}:`, error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      setError('Failed to establish WebSocket connection');
      console.error('WebSocket connection error:', error);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: string | object) => {
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(messageStr);
      } else {
        messageQueue.current.push(messageStr);
        if (!isConnected) {
          connect();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  }, [connect, isConnected]);

  const on = useCallback((type: string, handler: MessageHandler) => {
    if (!eventHandlers.current.has(type)) {
      eventHandlers.current.set(type, new Set());
    }
    eventHandlers.current.get(type)!.add(handler);
  }, []);

  const off = useCallback((type: string, handler: MessageHandler) => {
    const handlers = eventHandlers.current.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    retryDelay.current = INITIAL_RETRY_DELAY;
    connect();
  }, [connect]);

  return {
    isConnected,
    error,
    sendMessage,
    on,
    off,
    reconnect,
  };
};
