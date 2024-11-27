import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Stack,
  useToast as useChakraToast,
  ToastId,
} from '@chakra-ui/react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { DocumentUploader } from './DocumentUploader';
import { ProcessingStatus } from './ProcessingStatus';
import { ProcessorControls } from './ProcessorControls';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

interface ProcessingState {
  documentId?: string;
  currentStep: string;
  steps: ProcessingStep[];
}

const initialSteps: ProcessingStep[] = [
  { id: 'upload', label: 'Document Upload', status: 'pending' },
  { id: 'extract', label: 'Content Extraction', status: 'pending' },
  { id: 'process', label: 'Processing', status: 'pending' },
  { id: 'index', label: 'Indexing', status: 'pending' },
];

export const DocumentProcessor: React.FC = () => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    currentStep: 'upload',
    steps: initialSteps,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useChakraToast();

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'processing_update':
        setProcessingState(prevState => ({
          ...prevState,
          currentStep: data.step,
          steps: prevState.steps.map(step => {
            if (step.id === data.step) {
              return {
                ...step,
                status: 'processing',
                progress: data.progress,
              };
            } else if (prevState.steps.findIndex(s => s.id === step.id) <
                      prevState.steps.findIndex(s => s.id === data.step)) {
              return {
                ...step,
                status: 'completed',
                progress: 100,
              };
            }
            return step;
          }),
        }));
        break;

      case 'processing_complete':
        setProcessingState(prevState => ({
          ...prevState,
          steps: prevState.steps.map(step => ({
            ...step,
            status: 'completed',
            progress: 100,
          })),
        }));
        setIsProcessing(false);
        toast({
          title: 'Processing Complete',
          description: 'Document has been successfully processed',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        break;

      case 'processing_error':
        setProcessingState(prevState => ({
          ...prevState,
          steps: prevState.steps.map(step =>
            step.id === data.step
              ? { ...step, status: 'error', error: data.error }
              : step
          ),
        }));
        setIsProcessing(false);
        toast({
          title: 'Processing Error',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        break;
    }
  }, [toast]);

  const { sendMessage, isConnected } = useWebSocket('ws://localhost:8000/ws/processor');

  useEffect(() => {
    if (isConnected) {
      const wsHandler = (data: any) => handleWebSocketMessage(data);
      return () => {
        // Cleanup if needed
      };
    }
  }, [isConnected, handleWebSocketMessage]);

  const handleUploadSuccess = useCallback((fileInfo: { name: string; type: string; size: number }) => {
    setProcessingState(prevState => ({
      ...prevState,
      documentId: `doc-${Date.now()}`,
      steps: prevState.steps.map(step =>
        step.id === 'upload'
          ? { ...step, status: 'completed', progress: 100 }
          : step
      ),
      currentStep: 'extract',
    }));
  }, []);

  const handleStart = useCallback(() => {
    if (!processingState.documentId) {
      toast({
        title: 'Error',
        description: 'Please upload a document first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsProcessing(true);
    sendMessage({
      type: 'start_processing',
      documentId: processingState.documentId,
    });
  }, [processingState.documentId, sendMessage, toast]);

  const handleStop = useCallback(() => {
    setIsProcessing(false);
    sendMessage({
      type: 'stop_processing',
      documentId: processingState.documentId,
    });
  }, [processingState.documentId, sendMessage]);

  const handleReset = useCallback(() => {
    setProcessingState({
      currentStep: 'upload',
      steps: initialSteps,
    });
    setIsProcessing(false);
    sendMessage({
      type: 'reset_processor',
    });
  }, [sendMessage]);

  return (
    <Box width="100%" maxWidth="800px" mx="auto" p={4}>
      <Stack direction="column" spacing={6}>
        <DocumentUploader
          onUploadSuccess={handleUploadSuccess}
          acceptedFileTypes={['.pdf', '.docx', '.txt']}
        />

        <ProcessingStatus
          steps={processingState.steps}
          currentStep={processingState.currentStep}
        />

        <ProcessorControls
          onStart={handleStart}
          onStop={handleStop}
          onReset={handleReset}
          isProcessing={isProcessing}
          canReset={processingState.steps.some(step =>
            step.status === 'completed' || step.status === 'error'
          )}
        />
      </Stack>
    </Box>
  );
};
