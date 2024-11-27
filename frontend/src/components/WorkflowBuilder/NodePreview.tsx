import React, { useEffect, useState } from 'react';
import {
  Box,
  Text,
  Stack,
  Badge,
  useColorModeValue,
  HStack,
} from '@chakra-ui/react';
import { Node } from './types';

interface NodePreviewProps {
  node: Node;
  onProcessingComplete?: (result: any) => void;
}

export const NodePreview: React.FC<NodePreviewProps> = ({ node, onProcessingComplete }) => {
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const metaColor = useColorModeValue('gray.500', 'gray.400');

  const [previewData, setPreviewData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processNode = async () => {
      setIsProcessing(true);
      try {
        // Simulate node processing based on type
        let result;
        switch (node.type) {
          case 'document':
            result = await previewDocument(node.data);
            break;
          case 'url':
            result = await previewUrl(node.data);
            break;
          case 'notion':
            result = await previewNotion(node.data);
            break;
          case 'confluence':
            result = await previewConfluence(node.data);
            break;
          default:
            result = { status: 'unknown', message: 'Unknown node type' };
        }
        setPreviewData(result);
        onProcessingComplete?.(result);
      } catch (error) {
        setPreviewData({ status: 'error', message: error.message });
      } finally {
        setIsProcessing(false);
      }
    };

    if (node.data) {
      processNode();
    }
  }, [node, onProcessingComplete]);

  const previewDocument = async (data: any) => {
    // Simulate document preview processing
    return {
      status: 'success',
      type: 'document',
      content: `Processing ${data.filename || 'document'}...`,
      metadata: {
        type: data.fileType,
        size: data.fileSize,
      }
    };
  };

  const previewUrl = async (data: any) => {
    // Simulate URL preview processing
    return {
      status: 'success',
      type: 'url',
      content: `Fetching content from ${data.url}...`,
      metadata: {
        url: data.url,
        timestamp: new Date().toISOString(),
      }
    };
  };

  const previewNotion = async (data: any) => {
    // Simulate Notion preview processing
    return {
      status: 'success',
      type: 'notion',
      content: `Loading Notion page ${data.pageId}...`,
      metadata: {
        pageId: data.pageId,
        timestamp: new Date().toISOString(),
      }
    };
  };

  const previewConfluence = async (data: any) => {
    // Simulate Confluence preview processing
    return {
      status: 'success',
      type: 'confluence',
      content: `Loading Confluence page ${data.pageId}...`,
      metadata: {
        pageId: data.pageId,
        timestamp: new Date().toISOString(),
      }
    };
  };

  return (
    <Box
      p={3}
      bg={bgColor}
      borderRadius="md"
      boxShadow="sm"
      border="1px solid"
      borderColor={borderColor}
    >
      <Stack spacing={2} width="100%">
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="medium">
            {node.type} Preview
          </Text>
          <Badge
            colorScheme={isProcessing ? 'yellow' : previewData?.status === 'error' ? 'red' : 'green'}
          >
            {isProcessing ? 'Processing' : previewData?.status || 'Ready'}
          </Badge>
        </HStack>

        {previewData && (
          <Box fontSize="xs">
            <Text color={textColor}>
              {previewData.content}
            </Text>
            {previewData.metadata && (
              <Stack mt={2} spacing={1} width="100%">
                {Object.entries(previewData.metadata).map(([key, value]) => (
                  <Text key={key} color={metaColor}>
                    {key}: {String(value)}
                  </Text>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  );
};
