import React, { useCallback } from 'react';
import {
  Box,
  Stack,
  useColorMode,
} from '@chakra-ui/react';
import { NodePreview } from './NodePreview';
import { Node } from './types';
import { useWebSocket } from '../../hooks/useWebSocket';

interface PreviewManagerProps {
  nodes: Node[];
  onPreviewUpdate?: (nodeId: string, previewData: any) => void;
}

export const PreviewManager: React.FC<PreviewManagerProps> = ({
  nodes,
  onPreviewUpdate,
}) => {
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'light' ? 'gray.50' : 'gray.800';
  const { sendMessage } = useWebSocket('ws://localhost:8000/ws');

  const handleProcessingComplete = useCallback((nodeId: string, result: any) => {
    onPreviewUpdate?.(nodeId, result);
    sendMessage(JSON.stringify({
      type: 'preview_updated',
      payload: {
        nodeId,
        previewData: result,
      },
    }));
  }, [onPreviewUpdate, sendMessage]);

  return (
    <Box
      position="absolute"
      top={4}
      right={4}
      width="300px"
      maxHeight="calc(100vh - 32px)"
      overflowY="auto"
      bg={bgColor}
      borderRadius="md"
      p={4}
      boxShadow="lg"
    >
      <Stack direction="column" spacing={4}>
        {nodes.map((node) => (
          <NodePreview
            key={node.id}
            node={node}
            onProcessingComplete={(result) => handleProcessingComplete(node.id, result)}
          />
        ))}
      </Stack>
    </Box>
  );
};
