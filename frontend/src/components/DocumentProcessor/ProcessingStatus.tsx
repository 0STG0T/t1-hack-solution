import React from 'react';
import {
  Box,
  Text,
  Stack,
  Flex,
  Icon,
  Progress as ChakraProgress,
  useColorMode,
} from '@chakra-ui/react';
import { FiCheck, FiX, FiLoader } from 'react-icons/fi';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

interface ProcessingStatusProps {
  steps: ProcessingStep[];
  currentStep: string;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  steps,
  currentStep,
}) => {
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'light' ? 'white' : 'gray.700';
  const borderColor = colorMode === 'light' ? 'gray.200' : 'gray.600';

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return <Icon as={FiCheck} color="green.500" />;
      case 'error':
        return <Icon as={FiX} color="red.500" />;
      case 'processing':
        return (
          <Icon
            as={FiLoader}
            color="blue.500"
            className="animate-spin"
            animation="spin 1s linear infinite"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      borderWidth={1}
      borderColor={borderColor}
    >
      <Stack spacing={4}>
        {steps.map((step) => (
          <Box key={step.id}>
            <Flex justify="space-between" mb={2}>
              <Text fontWeight={currentStep === step.id ? 'bold' : 'normal'}>
                {step.label}
              </Text>
              {getStepIcon(step.status)}
            </Flex>
            {step.status === 'processing' && (
              <ChakraProgress
                size="sm"
                value={step.progress}
                colorScheme="blue"
                hasStripe
                isAnimated
              />
            )}
            {step.status === 'error' && (
              <Text fontSize="sm" color="red.500">
                {step.error}
              </Text>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
