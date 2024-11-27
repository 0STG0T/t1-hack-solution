import React, { createContext, useContext, useEffect, useState } from 'react';
import wsClient from '../utils/websocketClient';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (type: string, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket server
    const wsUrl = import.meta.env.PROD
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:8000/ws';

    wsClient.connect(wsUrl);

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleMessage = (message: any) => {
      switch (message.type) {
        case 'document_processed':
          // Handle document processing updates
          const { documentId, metadata, content } = message.data;
          // Dispatch document processing event
          window.dispatchEvent(new CustomEvent('documentProcessed', {
            detail: { documentId, metadata, content }
          }));
          break;
        case 'workflow_updated':
          // Handle workflow updates
          window.dispatchEvent(new CustomEvent('workflowUpdated', {
            detail: message.data
          }));
          break;
        case 'element_updated':
          // Handle drag-and-drop element updates
          window.dispatchEvent(new CustomEvent('elementUpdated', {
            detail: message.data
          }));
          break;
        case 'error':
          console.error('WebSocket error:', message.data);
          window.dispatchEvent(new CustomEvent('wsError', {
            detail: message.data
          }));
          break;
        default:
          console.log('Received message:', message);
      }
    };

    // Update WebSocket client options
    Object.assign(wsClient, {
      options: {
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onMessage: handleMessage,
        onError: (error: Event) => {
          console.error('WebSocket error:', error);
          window.dispatchEvent(new CustomEvent('wsError', {
            detail: { message: 'WebSocket connection error', error }
          }));
        },
        metadata: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          groups: ['default'],
          features: {
            documentProcessing: true,
            workflowBuilder: true,
            search: true,
            urlIntegration: true,
            notionIntegration: true,
            confluenceIntegration: true
          }
        }
      }
    });

    return () => {
      wsClient.disconnect();
    };
  }, []);

  const sendMessage = (type: string, data: any) => {
    wsClient.send(type, data);
  };

  const value = {
    isConnected,
    sendMessage
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
