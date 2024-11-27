import React, { useEffect, useState } from 'react';
import { useSecureWebSocket } from '../../hooks/useSecureWebSocket';
import { WebSocketMessageType, createWebSocketMessage } from '../../types/websocket';

interface NodePreviewHandlerProps {
  nodeId: string;
  nodeType: string;
  data: any;
}

interface PreviewState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
}

export const NodePreviewHandler: React.FC<NodePreviewHandlerProps> = ({
  nodeId,
  nodeType,
  data,
}) => {
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });
  const [isVisible, setIsVisible] = useState(false);
  const { sendMessage } = useSecureWebSocket({
    url: `ws://${window.location.hostname}:8000/ws`,
    encryptionKey: window.sessionStorage.getItem('ws_encryption_key') || '',
    onMessage: (message) => {
      switch (message.type) {
        case WebSocketMessageType.PREVIEW_UPDATE:
          if (message.payload.nodeId === nodeId) {
            setPreview({
              status: 'success',
              data: message.payload
            });
          }
          break;
        case WebSocketMessageType.ERROR:
          if (message.payload.nodeId === nodeId) {
            setPreview({
              status: 'error',
              error: message.payload.error
            });
          }
          break;
      }
    }
  });

  useEffect(() => {
    setIsVisible(true);
    const requestPreview = async () => {
      setPreview({ status: 'loading' });
      try {
        sendMessage(createWebSocketMessage(
          WebSocketMessageType.PREVIEW_REQUEST,
          { nodeId, nodeType, data }
        ));
      } catch (error) {
        setPreview({
          status: 'error',
          error: error instanceof Error ? error.message : 'Preview request failed'
        });
      }
    };
    requestPreview();
    return () => setIsVisible(false);
  }, [nodeId, nodeType, data, sendMessage]);

  const renderPreview = () => {
    switch (preview.status) {
      case 'loading':
        return (
          <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Processing {nodeType}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                Analyzing content and preparing preview...
              </p>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                {nodeType}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ID: {nodeId.slice(0, 8)}
              </span>
            </div>

            <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">
                {preview.data?.preview || 'No preview available'}
              </p>
            </div>

            {preview.data?.metadata && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.data.metadata).map(([key, value]) => (
                  <div key={key} className="px-2 py-1 text-xs bg-gray-100/70 dark:bg-gray-800/70 rounded-md">
                    <span className="font-medium text-gray-600 dark:text-gray-400">{key}:</span>
                    <span className="ml-1 text-gray-700 dark:text-gray-300">
                      {key === 'updated_at' ? new Date(value as string).toLocaleString() : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'error':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                Error Processing {nodeType}
              </span>
            </div>
            <div className="p-3 bg-red-50/50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                {preview.error || 'Failed to load preview'}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`
      transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
      border border-gray-200 dark:border-gray-700
      rounded-xl shadow-lg hover:shadow-xl
    `}>
      {renderPreview()}
    </div>
  );
};
