export enum WebSocketMessageType {
  WORKFLOW_UPDATE = 'workflow_update',
  NODE_UPDATE = 'node_update',
  PREVIEW_REQUEST = 'preview_request',
  PREVIEW_UPDATE = 'preview_update',
  ERROR = 'error',
  DOCUMENT_PROCESS = 'document_process',
  URL_PROCESS = 'url_process',
  NOTION_PROCESS = 'notion_process',
  CONFLUENCE_PROCESS = 'confluence_process'
}

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: number;
  sessionId?: string;
}

export interface WorkflowUpdatePayload {
  nodes?: any[];
  edges?: any[];
}

export interface NodeUpdatePayload {
  nodeId: string;
  position: { x: number; y: number };
  data?: any;
}

export interface PreviewRequestPayload {
  nodeId: string;
  nodeType: string;
  config?: Record<string, any>;
}

export interface PreviewUpdatePayload {
  nodeId: string;
  preview: string;
  title?: string;
  metadata?: {
    updated_at: number;
    source_type?: string;
    [key: string]: any;
  };
}

export interface ErrorPayload {
  nodeId?: string;
  error: string;
  details?: any;
}

export interface ProcessPayload {
  type: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export const createWebSocketMessage = <T>(
  type: WebSocketMessageType,
  payload: T,
  sessionId?: string
): WebSocketMessage<T> => ({
  type,
  payload,
  timestamp: Date.now(),
  sessionId,
});
