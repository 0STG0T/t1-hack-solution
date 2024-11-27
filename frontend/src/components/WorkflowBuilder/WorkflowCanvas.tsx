import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  ReactFlowInstance,
  Edge,
  BackgroundVariant,
  NodeTypes,
  NodeChange,
  EdgeChange,
  OnNodesChange,
  OnEdgesChange,
  NodeProps,
  Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DocumentNode } from './nodes/DocumentNode';
import { ProcessorNode } from './nodes/ProcessorNode';
import { OutputNode } from './nodes/OutputNode';
import { NodeToolbar } from './NodeToolbar';
import { PreviewPanel } from './PreviewPanel';
import { useSecureWebSocket, WebSocketMessageType, createWebSocketMessage } from '../../hooks/useSecureWebSocket';

interface NodeData {
  type: string;
  preview?: any;
  label?: string;
  nodeType?: string;
  [key: string]: any;
}

interface WorkflowCanvasProps {
  className?: string;
  wsEndpoint?: string;
  encryptionKey: string;
  onWorkflowUpdate?: (nodes: Node<NodeData>[], edges: Edge[]) => void;
}

const nodeTypes: NodeTypes = {
  documentNode: DocumentNode,
  processorNode: ProcessorNode,
  outputNode: OutputNode,
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  wsEndpoint = 'ws://localhost:8000/ws',
  encryptionKey,
  onWorkflowUpdate
}) => {
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | undefined>();
  const [isDragging, setIsDragging] = useState(false);

  const { isConnected, sendMessage } = useSecureWebSocket({
    url: wsEndpoint,
    encryptionKey,
    onMessage: (message) => {
      if (message.type === WebSocketMessageType.WORKFLOW_UPDATE) {
        setNodes(message.payload.nodes);
        setEdges(message.payload.edges);
      } else if (message.type === WebSocketMessageType.PREVIEW_UPDATE) {
        setPreviewLoading(false);
        setPreviewError(undefined);
        if (selectedNode?.id === message.payload.nodeId) {
          setNodes((nds: Node<NodeData>[]) =>
            nds.map((node) =>
              node.id === message.payload.nodeId
                ? { ...node, data: { ...node.data, preview: message.payload.preview } }
                : node
            )
          );
        }
      } else if (message.type === WebSocketMessageType.ERROR) {
        setPreviewLoading(false);
        setPreviewError(message.payload.error);
      }
    },
    onError: (error) => {
      setPreviewError('Connection error: ' + error.message);
    },
  });

  useEffect(() => {
    if (selectedNode) {
      setPreviewLoading(true);
      sendMessage(createWebSocketMessage(WebSocketMessageType.PREVIEW_REQUEST, {
        nodeId: selectedNode.id,
        nodeType: selectedNode.type,
        connections: edges.filter(edge =>
          edge.source === selectedNode.id || edge.target === selectedNode.id
        )
      }));
    }

    onWorkflowUpdate?.(nodes, edges);
  }, [selectedNode, edges, nodes, sendMessage, onWorkflowUpdate]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds: Node<NodeData>[]) => {
        const updatedNodes = nds.map(node => {
          const change = changes.find(c => c.id === node.id);
          if (change && change.type === 'position') {
            return { ...node, position: change.position };
          }
          return node;
        });
        return updatedNodes;
      });
    },
    [setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds: Edge[]) => {
        const updatedEdges = eds.map(edge => {
          const change = changes.find(c => c.id === edge.id);
          if (change) {
            return { ...edge, ...change };
          }
          return edge;
        });
        return updatedEdges;
      });
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(node => node.id === params.source);
      const targetNode = nodes.find(node => node.id === params.target);

      if (sourceNode && targetNode) {
        const newEdge: Edge = {
          id: `${params.source}-${params.target}`,
          source: params.source || '',
          target: params.target || '',
          sourceHandle: params.sourceHandle || null,
          targetHandle: params.targetHandle || null,
          type: 'default',
          data: { animated: true }
        };
        setEdges((eds: Edge[]) => addEdge(newEdge, eds));

        if (isConnected) {
          sendMessage(createWebSocketMessage(WebSocketMessageType.WORKFLOW_UPDATE, {
            nodes,
            edges: [...edges, newEdge]
          }));

          sendMessage(createWebSocketMessage(WebSocketMessageType.PREVIEW_REQUEST, {
            nodeId: params.target,
            connections: [...edges, newEdge]
          }));
        }
      }
    },
    [nodes, edges, setEdges, isConnected, sendMessage]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (reactFlowWrapper.current && reactFlowInstance) {
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow');

        const position = reactFlowInstance.project({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });

        const newNode: Node = {
          id: `${type}-${Date.now()}`,
          type,
          position,
          data: {
            label: type.split('-').map(word =>
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            nodeType: type,
          },
        };

        setNodes((nds: Node[]) => [...nds, newNode]);

        if (isConnected) {
          sendMessage(createWebSocketMessage(WebSocketMessageType.WORKFLOW_UPDATE, {
            nodes: [...nodes, newNode],
            edges
          }));

          // Request preview for the new node
          sendMessage(createWebSocketMessage(WebSocketMessageType.PREVIEW_REQUEST, {
            nodeId: newNode.id,
            connections: edges
          }));
        }
      }
    },
    [reactFlowInstance, setNodes, nodes, edges, isConnected, sendMessage]
  );

  const ParticleBackground: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className={`
            absolute rounded-full backdrop-blur-md
            ${i % 4 === 0 ? 'w-24 h-24' : i % 3 === 0 ? 'w-16 h-16' : i % 2 === 0 ? 'w-12 h-12' : 'w-8 h-8'}
            bg-gradient-to-br
            ${i % 3 === 0
              ? 'from-blue-400/10 via-indigo-400/10 to-purple-400/10 dark:from-blue-400/5 dark:via-indigo-400/5 dark:to-purple-400/5'
              : i % 2 === 0
                ? 'from-emerald-400/10 via-green-400/10 to-teal-400/10 dark:from-emerald-400/5 dark:via-green-400/5 dark:to-teal-400/5'
                : 'from-pink-400/10 via-rose-400/10 to-red-400/10 dark:from-pink-400/5 dark:via-rose-400/5 dark:to-red-400/5'
            }
            animate-float-${i % 5}
            shadow-xl shadow-${i % 3 === 0 ? 'blue' : i % 2 === 0 ? 'emerald' : 'pink'}-500/10
          `}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            transform: `scale(${0.5 + Math.random() * 1.5})`,
            filter: `blur(${Math.random() * 2}px)`
          }}
        />
      ))}
    </div>
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="relative w-full h-screen bg-gradient-radial
        from-gray-50/95 via-gray-100/95 to-gray-50/95
        dark:from-gray-900/95 dark:via-gray-800/95 dark:to-gray-900/95
        backdrop-blur-2xl"
    >
      <ParticleBackground />
      <ReactFlowProvider>
        <div style={{ width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
            />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'documentNode':
                    return '#10B981';
                  case 'processorNode':
                    return '#3B82F6';
                  default:
                    return '#64748B';
                }
              }}
            />
          </ReactFlow>
          {selectedNode && (
            <PreviewPanel
              nodeId={selectedNode.id}
              nodeType={selectedNode.type}
              data={selectedNode.data}
              loading={previewLoading}
              error={previewError}
            />
          )}
          <NodeToolbar />
        </div>
      </ReactFlowProvider>
    </div>
  );
};
