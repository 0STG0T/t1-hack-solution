import React, { useCallback } from 'react';
import {
  Box,
  Button,
  Text,
  Stack,
  useToast as useChakraToast,
  ToastId,
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { FiUpload } from 'react-icons/fi';
import { useWebSocket } from '../../hooks/useWebSocket';

interface DocumentUploaderProps {
  onUploadSuccess?: (fileInfo: { name: string; type: string; size: number }) => void;
  acceptedFileTypes?: string[];
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadSuccess,
  acceptedFileTypes = ['.pdf', '.docx', '.txt']
}) => {
  const toast = useChakraToast();
  const { sendMessage, isConnected } = useWebSocket('ws://localhost:8000/ws/documents');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    let toastId: ToastId;

    try {
      toastId = toast({
        title: 'Uploading document',
        description: `Processing ${file.name}...`,
        status: 'info',
        duration: null,
        isClosable: false,
      });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      if (isConnected) {
        sendMessage({
          type: 'document_uploaded',
          data: {
            filename: file.name,
            type: file.type,
            size: file.size,
            documentId: result.documentId
          }
        });
      }

      onUploadSuccess?.({
        name: file.name,
        type: file.type,
        size: file.size
      });

      if (toastId) {
        toast.update(toastId, {
          title: 'Document uploaded',
          description: `Successfully uploaded ${file.name}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      if (toastId) {
        toast.update(toastId, {
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'An error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [onUploadSuccess, sendMessage, isConnected, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({
      ...acc,
      [type]: []
    }), {}),
    maxFiles: 1
  });

  return (
    <Box
      {...getRootProps()}
      p={6}
      border="2px dashed"
      borderColor={isDragActive ? 'blue.400' : 'gray.200'}
      borderRadius="lg"
      bg={isDragActive ? 'blue.50' : 'white'}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        borderColor: 'blue.400',
        bg: 'blue.50'
      }}
    >
      <input {...getInputProps()} />
      <Stack spacing={2} align="center">
        <FiUpload size={24} />
        <Text textAlign="center">
          {isDragActive
            ? 'Drop the file here'
            : 'Drag and drop a document, or click to select'}
        </Text>
        <Text fontSize="sm" color="gray.500">
          Supported formats: {acceptedFileTypes.join(', ')}
        </Text>
        <Button size="sm" colorScheme="blue" variant="outline">
          Select File
        </Button>
      </Stack>
    </Box>
  );
};
