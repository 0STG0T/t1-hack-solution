import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Text,
  Flex,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiTrash2, FiLink, FiZoomIn, FiZoomOut, FiEye, FiEyeOff } from 'react-icons/fi';
import { PreviewManager } from './PreviewManager';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Node, Connection } from './types';

interface DragDropCanvasProps {
  nodes: Node[];
  onNodesChange: (nodes: Node[]) => void;
  onConnect: (connection: Connection) => void;
  onDisconnect: (connectionId: string) => void;
}

export const DragDropCanvas: React.FC<DragDropCanvasProps> = ({
  nodes,
  onNodesChange,
  onConnect,
  onDisconnect,
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const gridColor = useColorModeValue('gray.100', 'gray.700');
  const nodeColor = useColorModeValue('gray.100', 'gray.700');
  const selectedNodeColor = useColorModeValue('blue.500', 'blue.400');

  const { sendMessage } = useWebSocket('ws://localhost:8000/ws');

  const handleNodeDrag = useCallback(
    (nodeId: string, newPosition: { x: number; y: number }) => {
      const updatedNodes = nodes.map((node) =>
        node.id === nodeId ? { ...node, position: newPosition } : node
      );
      onNodesChange(updatedNodes);
      sendMessage(JSON.stringify({
        type: 'node_moved',
        payload: { id: nodeId, position: newPosition }
      }));
    },
    [nodes, onNodesChange, sendMessage]
  );

  const handleNodeClick = useCallback(
    (nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (connecting) {
        if (connecting !== nodeId) {
          const newConnection: Connection = {
            id: `${connecting}-${nodeId}`,
            sourceId: connecting,
            targetId: nodeId,
          };
          onConnect(newConnection);
        }
        setConnecting(null);
      } else {
        setSelectedNode(nodeId === selectedNode ? null : nodeId);
      }
    },
    [connecting, selectedNode, onConnect]
  );

  const startConnecting = useCallback(
    (nodeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setConnecting(nodeId);
    },
    []
  );

  const handleCanvasClick = useCallback(() => {
    setSelectedNode(null);
    setConnecting(null);
  }, []);

  const handleZoom = useCallback(
    (delta: number) => {
      const newZoom = Math.min(Math.max(zoom + delta, 0.5), 2);
      setZoom(newZoom);
    },
    [zoom]
  );

  const handlePreviewUpdate = useCallback((nodeId: string, data: any) => {
    setPreviewData(prev => ({
      ...prev,
      [nodeId]: data
    }));
  }, []);

  return (
    <Box
      ref={canvasRef}
      position="relative"
      w="100%"
      h="600px"
      bg={bgColor}
      backgroundImage={`linear-gradient(${gridColor} 1px, transparent 1px),
        linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`}
      backgroundSize={`${20 * zoom}px ${20 * zoom}px`}
      overflow="hidden"
      onClick={handleCanvasClick}
    >
      <Flex position="absolute" top={4} right={4} gap={2}>
        <IconButton
          aria-label="Zoom In"
          icon={<FiZoomIn />}
          size="sm"
          onClick={() => handleZoom(0.1)}
          variant="solid"
        />
        <IconButton
          aria-label="Zoom Out"
          icon={<FiZoomOut />}
          size="sm"
          onClick={() => handleZoom(-0.1)}
          variant="solid"
        />
        <IconButton
          aria-label={showPreview ? 'Hide Preview' : 'Show Preview'}
          icon={showPreview ? <FiEyeOff /> : <FiEye />}
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          variant="solid"
        />
      </Flex>

      {showPreview && (
        <PreviewManager
          nodes={nodes}
          onPreviewUpdate={handlePreviewUpdate}
        />
      )}

      {nodes.map((node) => (
        <motion.div
          key={node.id}
          style={{
            position: 'absolute',
            x: node.position.x,
            y: node.position.y,
            scale: zoom,
          }}
          drag
          dragMomentum={false}
          onDrag={(_, info) => {
            handleNodeDrag(node.id, {
              x: info.point.x,
              y: info.point.y,
            });
          }}
          onClick={(e) => handleNodeClick(node.id, e)}
        >
          <Box
            p={4}
            bg={selectedNode === node.id ? selectedNodeColor : nodeColor}
            color={selectedNode === node.id ? 'white' : 'inherit'}
            borderRadius="md"
            boxShadow="md"
            cursor="move"
            position="relative"
            minW="150px"
          >
            <Text fontWeight="bold">{node.type}</Text>
            {previewData[node.id] && (
              <Text fontSize="xs" mt={1} color="gray.500">
                Status: {previewData[node.id].status}
              </Text>
            )}
            <Flex position="absolute" top={-4} right={-4} gap={1}>
              <IconButton
                aria-label={connecting === node.id ? 'Cancel Connection' : 'Start Connection'}
                size="sm"
                icon={<FiLink />}
                onClick={(e) => startConnecting(node.id, e)}
                variant="solid"
              />
              <IconButton
                aria-label="Delete Node"
                size="sm"
                icon={<FiTrash2 />}
                onClick={() => {
                  const updatedNodes = nodes.filter((n) => n.id !== node.id);
                  onNodesChange(updatedNodes);
                  sendMessage(JSON.stringify({
                    type: 'node_deleted',
                    payload: { id: node.id }
                  }));
                }}
                variant="solid"
              />
            </Flex>
          </Box>
        </motion.div>
      ))}

      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {nodes.map((sourceNode) =>
          sourceNode.connections.map((targetId) => {
            const targetNode = nodes.find((n) => n.id === targetId);
            if (!targetNode) return null;

            return (
              <line
                key={`${sourceNode.id}-${targetId}`}
                x1={sourceNode.position.x + 75}
                y1={sourceNode.position.y + 32}
                x2={targetNode.position.x + 75}
                y2={targetNode.position.y + 32}
                stroke={useColorModeValue('#718096', '#A0AEC0')}
                strokeWidth={2}
              />
            );
          })
        )}
      </svg>
    </Box>
  );
};
