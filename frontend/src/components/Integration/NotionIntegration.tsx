import React, { useState, useCallback } from 'react';
import {
  Box,
  Input,
  Button,
  Stack,
  Text,
  useToast as useChakraToast,
  FormControl as ChakraFormControl,
  FormLabel as ChakraFormLabel,
  FormHelperText as ChakraFormHelperText,
  Alert as ChakraAlert,
  AlertIcon as ChakraAlertIcon,
} from '@chakra-ui/react';
import { useSecureWebSocket, WebSocketMessageType, createWebSocketMessage } from '../../hooks/useSecureWebSocket';
import { securityUtils } from '../../utils/security';

interface NotionIntegrationProps {
  onDocumentProcessed?: (data: any) => void;
  encryptionKey: string;
}

export const NotionIntegration: React.FC<NotionIntegrationProps> = ({
  onDocumentProcessed,
  encryptionKey,
}) => {
  const [notionUrl, setNotionUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useChakraToast();

  const { sendMessage, isConnected, isError, errorMessage } = useSecureWebSocket({
    url: `${process.env.VITE_API_URL || 'http://localhost:8000'}/ws`,
    encryptionKey,
    onMessage: (message) => {
      if (message.type === WebSocketMessageType.DOCUMENT_PROCESS) {
        setIsProcessing(false);
        onDocumentProcessed?.(message.payload);
        toast({
          title: 'Document processed',
          description: 'Notion page has been successfully processed',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    },
    onError: (error) => {
      setIsProcessing(false);
      toast({
        title: 'Processing error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const validateNotionUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('notion.site');
    } catch {
      return false;
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!validateNotionUrl(notionUrl)) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid Notion page URL',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsProcessing(true);

    const sanitizedUrl = securityUtils.sanitizeInput(notionUrl);

    const message = createWebSocketMessage(WebSocketMessageType.DOCUMENT_PROCESS, {
      type: 'notion',
      url: sanitizedUrl,
    });

    sendMessage(message);
  }, [notionUrl, sendMessage, toast]);

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <Stack spacing={4} direction="column">
        <Text fontSize="lg" fontWeight="bold">
          Notion Integration
        </Text>

        {isError && (
          <ChakraAlert status="error">
            <ChakraAlertIcon />
            {errorMessage || 'An error occurred while processing the document'}
          </ChakraAlert>
        )}

        <ChakraFormControl>
          <ChakraFormLabel>Notion Page URL</ChakraFormLabel>
          <Input
            value={notionUrl}
            onChange={(e) => setNotionUrl(e.target.value)}
            placeholder="https://your-workspace.notion.site/page-id"
            disabled={isProcessing}
          />
          <ChakraFormHelperText>
            Enter the URL of the Notion page you want to process
          </ChakraFormHelperText>
        </ChakraFormControl>

        <Button
          colorScheme="blue"
          onClick={handleSubmit}
          isLoading={isProcessing}
          loadingText="Processing"
          disabled={!isConnected || !notionUrl}
        >
          Process Notion Page
        </Button>

        {!isConnected && (
          <ChakraAlert status="warning">
            <ChakraAlertIcon />
            Not connected to server. Please check your connection.
          </ChakraAlert>
        )}
      </Stack>
    </Box>
  );
};
