import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeConfig, NodeConfig } from './nodeConfigs';
import { useSecureWebSocket } from '../../hooks/useSecureWebSocket';
import { WebSocketMessageType, WebSocketMessage, PreviewUpdatePayload, ErrorPayload, createWebSocketMessage } from '../../types/websocket';

interface WorkflowNodeData {
  label: string;
  type: string;
  config?: Record<string, any>;
}

interface PreviewState {
  loading: boolean;
  data?: {
    title?: string;
    preview?: string;
    source_type?: string;
    metadata?: Record<string, any>;
  };
  error?: string;
}

export const WorkflowNode: React.FC<NodeProps<WorkflowNodeData>> = ({ data, id }) => {
  const nodeConfig: NodeConfig = getNodeConfig(data.type);
  const { label, type } = data;
  const [preview, setPreview] = useState<PreviewState>({ loading: false });
  const [isHovered, setIsHovered] = useState(false);

  const { sendMessage } = useSecureWebSocket({
    url: `ws://${window.location.hostname}:8000/ws`,
    encryptionKey: window.sessionStorage.getItem('ws_encryption_key') || '',
    onMessage: (message: WebSocketMessage<PreviewUpdatePayload | ErrorPayload>) => {
      if (message.payload.nodeId === id) {
        if (message.type === WebSocketMessageType.PREVIEW_UPDATE) {
          const payload = message.payload as PreviewUpdatePayload;
          setPreview({
            loading: false,
            data: {
              title: payload.title || '',
              preview: payload.preview,
              source_type: payload.metadata?.source_type,
              metadata: payload.metadata
            }
          });
        } else if (message.type === WebSocketMessageType.ERROR) {
          setPreview({
            loading: false,
            error: (message.payload as ErrorPayload).error
          });
        }
      }
    }
  });

  const requestPreview = () => {
    setPreview({ loading: true });
    sendMessage(createWebSocketMessage(
      WebSocketMessageType.PREVIEW_REQUEST,
      {
        nodeId: id,
        nodeType: type,
        config: data.config
      }
    ));
  };

  const getNodeStyles = (nodeType: string) => {
    const styles = {
      background: '',
      border: '',
      badge: '',
      handle: ''
    };

    switch (nodeType) {
      case 'document-input':
        styles.background = 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10';
        styles.border = 'border-blue-200 dark:border-blue-700';
        styles.badge = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        styles.handle = 'bg-blue-500';
        break;
      case 'url-input':
        styles.background = 'from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10';
        styles.border = 'border-green-200 dark:border-green-700';
        styles.badge = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        styles.handle = 'bg-green-500';
        break;
      case 'processor':
        styles.background = 'from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10';
        styles.border = 'border-yellow-200 dark:border-yellow-700';
        styles.badge = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        styles.handle = 'bg-yellow-500';
        break;
      case 'storage':
        styles.background = 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10';
        styles.border = 'border-purple-200 dark:border-purple-700';
        styles.badge = 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        styles.handle = 'bg-purple-500';
        break;
      default:
        styles.background = 'from-gray-50 to-gray-100/50 dark:from-gray-900/20 dark:to-gray-800/10';
        styles.border = 'border-gray-200 dark:border-gray-700';
        styles.badge = 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        styles.handle = 'bg-gray-500';
    }
    return styles;
  };

  const nodeStyles = getNodeStyles(type);

  return (
    <div
      className={`
        relative p-4 min-w-[240px] max-w-[320px]
        glass-effect dark:glass-effect-dark
        bg-gradient-to-br ${nodeStyles.background}
        backdrop-blur-xl
        border-[1.5px] ${nodeStyles.border} rounded-2xl
        shadow-lg hover:shadow-2xl
        transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
        ${isHovered ? 'scale-105 -translate-y-2 rotate-1 shadow-3xl animate-float-1' : 'animate-float-0'}
        cursor-pointer group
        animate-fade-in-up hover:glass-effect-hover dark:hover:glass-effect-dark-hover
        hover:border-opacity-50 hover:backdrop-blur-2xl
        hover:ring-2 hover:ring-offset-2 hover:ring-blue-500/20 dark:hover:ring-blue-400/20
        hover:-rotate-1 hover:translate-x-1
      `}
      onClick={requestPreview}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-white/5 dark:bg-black/5 rounded-2xl backdrop-blur-sm" />

      {/* Input handle with improved styling */}
      {nodeConfig.inputs.length > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={true}
          style={{
            width: '12px',
            height: '12px',
            marginLeft: '-6px',
            background: nodeStyles.handle,
            border: '1.5px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      )}

      <div className="relative flex flex-col gap-3 z-10">
        {/* Header with modern styling */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className={`
              relative w-3.5 h-3.5 rounded-full ${nodeStyles.handle}
              shadow-lg transform transition-all duration-500
              group-hover:scale-125 group-hover:animate-bounce-subtle
            `}>
              <div className="absolute inset-0 rounded-full animate-ping opacity-30" />
              <div className="absolute -inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm animate-pulse-subtle" />
            </div>
            <span className="text-sm font-medium bg-gradient-to-br
              from-gray-900 via-gray-800 to-gray-700
              dark:from-white dark:via-gray-200 dark:to-gray-300
              bg-clip-text text-transparent
              transform transition-all duration-500 ease-out
              group-hover:scale-105 group-hover:translate-x-0.5"
            >
              {label}
            </span>
          </div>
          <span className={`
            px-3 py-1 text-xs font-medium rounded-full
            glass-effect dark:glass-effect-dark
            transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            group-hover:scale-110 group-hover:rotate-2
            group-hover:shadow-xl hover:glass-effect-hover
            dark:hover:glass-effect-dark-hover
            border-[1.5px] ${nodeStyles.border}
          `}
          >
            {nodeConfig.label}
          </span>
        </div>

        {/* Input tags */}
        {nodeConfig.inputs.length > 0 && (
          <div className="space-y-1.5 animate-fade-in">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Inputs
            </span>
            <div className="flex flex-wrap gap-1.5">
              {nodeConfig.inputs.map((input, index) => (
                <span
                  key={index}
                  className={`
                    px-2.5 py-1 text-xs
                    glass-effect dark:glass-effect-dark
                    rounded-lg border-[1.5px] border-blue-200/30 dark:border-blue-700/30
                    transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                    hover:scale-110 hover:-translate-y-0.5 hover:rotate-1
                    hover:border-blue-300 dark:hover:border-blue-600
                    group-hover:animate-float-2
                    shadow-lg hover:shadow-xl backdrop-blur-lg
                    hover:glass-effect-hover dark:hover:glass-effect-dark-hover
                  `}
                >
                  {input.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Output tags */}
        {nodeConfig.outputs.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Outputs
            </span>
            <div className="flex flex-wrap gap-1.5">
              {nodeConfig.outputs.map((output, index) => (
                <span
                  key={index}
                  className={`
                    px-2.5 py-1 text-xs
                    glass-effect dark:glass-effect-dark
                    rounded-lg border-[1.5px] border-purple-200/30 dark:border-purple-700/30
                    transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                    hover:scale-110 hover:-translate-y-0.5 hover:-rotate-1
                    hover:border-purple-300 dark:hover:border-purple-600
                    group-hover:animate-float-3
                    shadow-lg hover:shadow-xl backdrop-blur-lg
                    hover:glass-effect-hover dark:hover:glass-effect-dark-hover
                  `}
                >
                  {output.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced loading state */}
        {preview.loading && (
          <div className="flex justify-center py-3 animate-fade-in">
            <div className="relative">
              <div className={`
                w-6 h-6 border-2 ${nodeStyles.handle}
                border-t-transparent rounded-full animate-spin
                shadow-xl group-hover:shadow-2xl
                transform transition-all duration-500
                group-hover:scale-125
              `}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-xl animate-pulse" />
              </div>
              <div className={`
                absolute -inset-2 bg-gradient-to-br ${nodeStyles.background}
                rounded-full blur-lg opacity-50 animate-ping
              `} />
            </div>
          </div>
        )}

        {/* Enhanced preview content */}
        {preview.data && (
          <div className={`
            mt-2 p-3.5 text-xs
            glass-effect dark:glass-effect-dark
            rounded-xl border-[1.5px]
            ${nodeStyles.border}
            transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            group-hover:scale-105 group-hover:-rotate-1
            group-hover:shadow-3xl group-hover:translate-y-1
            animate-fade-in backdrop-blur-xl
            hover:glass-effect-hover dark:hover:glass-effect-dark-hover
            hover:ring-2 hover:ring-offset-2 hover:ring-blue-500/20 dark:hover:ring-blue-400/20
          `}>
            <div className="relative overflow-hidden">
              <div className="absolute -inset-2 bg-gradient-to-br
                from-blue-400/20 via-purple-400/20 to-pink-400/20
                rounded-lg blur-2xl -z-10 animate-pulse-subtle" />
              <div className="absolute inset-0 bg-gradient-to-br
                from-white/40 to-white/10 dark:from-white/10 dark:to-white/5
                rounded-lg opacity-50" />
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-3
                transform transition-all duration-300 group-hover:scale-102">
                {preview.data.preview || preview.data.title}
              </p>
            </div>
          </div>
        )}

        {/* Enhanced error state */}
        {preview.error && (
          <div className={`
            mt-2 px-3.5 py-3 text-xs
            glass-effect dark:glass-effect-dark
            rounded-xl border-[1.5px] border-red-200/50 dark:border-red-800/50
            animate-fade-in backdrop-blur-xl
            transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            group-hover:scale-105 group-hover:-rotate-1
            hover:glass-effect-hover dark:hover:glass-effect-dark-hover
            relative overflow-hidden
          `}>
            <div className="absolute inset-0 bg-gradient-to-br
              from-red-400/10 via-red-500/10 to-red-600/10
              animate-pulse-subtle" />
            <div className="relative text-red-800 dark:text-red-200">
              {preview.error}
            </div>
          </div>
        )}
      </div>

      {/* Output handle with improved styling */}
      {nodeConfig.outputs.length > 0 && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={true}
          style={{
            width: '12px',
            height: '12px',
            marginRight: '-6px',
            background: nodeStyles.handle,
            border: '1.5px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      )}
    </div>
  );
};

export const nodeTypes = {
  workflowNode: WorkflowNode,
};
