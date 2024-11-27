import React, { useState, useCallback } from 'react';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import { ParticleBackground } from './ParticleBackground';
import { NodeToolbar } from './NodeToolbar';
import 'reactflow/dist/style.css';

interface WorkflowBuilderProps {
  onWorkflowUpdate?: (nodes: Node[], edges: Edge[]) => void;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ onWorkflowUpdate }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds) => {
      const updatedNodes = applyNodeChanges(changes, nds);
      onWorkflowUpdate?.(updatedNodes, edges);
      return updatedNodes;
    });
  }, [edges, onWorkflowUpdate]);

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden
      bg-gradient-to-br from-gray-50 to-gray-100
      dark:from-gray-900 dark:to-gray-800
      transition-colors duration-500"
    >
      <ParticleBackground />

      <div className="absolute inset-0 z-10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          className="glass-effect dark:glass-effect-dark
            animate-fade-in backdrop-blur-lg"
          fitView
        >
          <Background
            className="transition-opacity duration-500
              opacity-5 dark:opacity-10"
            color="#6366f1"
            gap={32}
            size={1}
          />
          <Controls
            className="glass-effect dark:glass-effect-dark
              !bg-opacity-50 !border-opacity-20
              hover:glass-effect-hover dark:hover:glass-effect-dark-hover
              transition-all duration-500"
          />
        </ReactFlow>
      </div>

      <NodeToolbar />
    </div>
  );
};

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export const WorkflowBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [isZooming, setIsZooming] = React.useState(false);

  const { sendMessage } = useSecureWebSocket({
    url: `ws://${window.location.hostname}:8000/ws`,
    encryptionKey: window.sessionStorage.getItem('ws_encryption_key') || '',
    onMessage: (message) => {
      switch (message.type) {
        case WebSocketMessageType.NODE_UPDATE:
          setNodes((nds) =>
            nds.map((node) =>
              node.id === message.payload.nodeId
                ? { ...node, position: message.payload.position, data: { ...node.data, ...message.payload.data } }
                : node
            )
          );
          break;
        case WebSocketMessageType.ERROR:
          console.error('Workflow error:', message.payload.error);
          break;
      }
    }
  });

  useEffect(() => {
    // Send initial workflow state
    sendMessage(createWebSocketMessage(
      WebSocketMessageType.WORKFLOW_UPDATE,
      {
        nodes,
        edges
      }
    ));
  }, []); // Empty dependency array for initial send only

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        sendMessage(createWebSocketMessage(
          WebSocketMessageType.WORKFLOW_UPDATE,
          { edges: newEdges }
        ));
        return newEdges;
      });
    },
    [setEdges, sendMessage]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      sendMessage(createWebSocketMessage(
        WebSocketMessageType.NODE_UPDATE,
        {
          nodeId: node.id,
          position: node.position,
          data: node.data
        }
      ));
    },
    [sendMessage]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');

      if (type) {
        const position = {
          x: event.clientX - event.currentTarget.getBoundingClientRect().left,
          y: event.clientY - event.currentTarget.getBoundingClientRect().top,
        };

        const nodeConfig = getNodeConfig(type);
        const newNode: WorkflowNode = {
          id: `${type}-${Date.now()}`,
          type: 'workflowNode',
          position,
          data: {
            label: nodeConfig.label,
            type: type,
            config: nodeConfig.config || {},
            acceptedTypes: nodeConfig.inputs[0]?.config?.acceptedTypes,
          },
        };

        setNodes((nds) => {
          const updatedNodes = nds.concat(newNode);
          sendMessage(createWebSocketMessage(
            WebSocketMessageType.WORKFLOW_UPDATE,
            { nodes: updatedNodes }
          ));
          return updatedNodes;
        });
      }
    },
    [setNodes, sendMessage]
  );

  const defaultEdgeOptions = {
    animated: true,
    style: {
      stroke: 'url(#edge-gradient)',
      strokeWidth: 2,
    },
  };

  // Add zoom handling
  const handleZoomStart = useCallback(() => {
    setIsZooming(true);
  }, []);

  const handleZoomEnd = useCallback(() => {
    setIsZooming(false);
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl transition-all duration-300">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-blue-400/5 to-transparent dark:from-blue-400/10" />
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-purple-400/5 to-transparent dark:from-purple-400/10 animate-float-0" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-green-400/5 to-transparent dark:from-green-400/10 animate-float-1" />
      </div>

      {/* Edge gradient definition */}
      <svg className="absolute w-0 h-0">
        <defs>
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className="text-blue-500" style={{ stopColor: 'currentColor', stopOpacity: 0.8 }} />
            <stop offset="100%" className="text-purple-500" style={{ stopColor: 'currentColor', stopOpacity: 0.8 }} />
          </linearGradient>
        </defs>
      </svg>

      {/* Node toolbar with modern styling */}
      <div className="absolute top-4 left-4 z-20 transform transition-all duration-300 ease-in-out hover:scale-102">
        <NodeToolbar />
      </div>

      {/* Main flow area */}
      <div className="h-[calc(100vh-6rem)] w-full backdrop-blur-sm">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onPaneClick={() => setSelectedNode(null)}
          onDrop={onDrop}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onMoveStart={handleZoomStart}
          onMoveEnd={handleZoomEnd}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          className="transition-all duration-500"
          minZoom={0.2}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="currentColor"
            className={`
              !bg-transparent text-gray-200 dark:text-gray-700
              transition-colors duration-300
              ${isZooming ? 'opacity-50' : 'opacity-100'}
            `}
          />
          <Controls
            className={`
              bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
              border border-gray-200 dark:border-gray-700 rounded-lg
              shadow-lg m-4 transition-all duration-300
              hover:shadow-xl hover:scale-105
              ${isZooming ? 'opacity-50' : 'opacity-100'}
            `}
            showInteractive={false}
          />
          <MiniMap
            className={`
              bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
              border border-gray-200 dark:border-gray-700 rounded-lg
              shadow-lg m-4 transition-all duration-300
              hover:shadow-xl hover:translate-y-[-2px]
              ${isZooming ? 'opacity-50' : 'opacity-100'}
            `}
            maskColor="rgba(0, 0, 0, 0.1)"
            nodeColor={(node) => {
              const colors = {
                'document-input': '#3b82f6',
                'url-input': '#10b981',
                'processor': '#eab308',
                'storage': '#8b5cf6'
              };
              return colors[node.data?.type as keyof typeof colors] || '#64748b';
            }}
            nodeStrokeWidth={3}
            nodeBorderRadius={8}
          />
        </ReactFlow>
      </div>

      {/* Preview panel with smooth transitions */}
      {selectedNode && (
        <div className={`
          absolute right-4 top-4 z-20 w-80
          transform transition-all duration-500 ease-out
          ${selectedNode ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
          animate-fade-in-up
        `}>
          <NodePreviewHandler
            nodeId={selectedNode}
            nodeType={nodes.find(n => n.id === selectedNode)?.data.type || ''}
            data={nodes.find(n => n.id === selectedNode)?.data || {}}
          />
        </div>
      )}
    </div>
  );
};
