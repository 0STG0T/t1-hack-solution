import React from 'react';
import {
  Box,
  Button,
  Stack,
  Tooltip as ChakraTooltip,
  useColorMode,
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiRefreshCw } from 'react-icons/fi';

interface ProcessorControlsProps {
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  isProcessing: boolean;
  canReset: boolean;
}

export const ProcessorControls: React.FC<ProcessorControlsProps> = ({
  onStart,
  onStop,
  onReset,
  isProcessing,
  canReset,
}) => {
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'light' ? 'white' : 'gray.700';
  const borderColor = colorMode === 'light' ? 'gray.200' : 'gray.600';

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      borderWidth={1}
      borderColor={borderColor}
    >
      <Stack direction="row" spacing={4} width="100%">
        <ChakraTooltip
          label={isProcessing ? 'Stop processing' : 'Start processing'}
          hasArrow
        >
          <Button
            leftIcon={isProcessing ? <FiPause /> : <FiPlay />}
            colorScheme={isProcessing ? 'red' : 'green'}
            onClick={isProcessing ? onStop : onStart}
            flex={1}
            aria-label={isProcessing ? 'Stop processing' : 'Start processing'}
          >
            {isProcessing ? 'Stop' : 'Start'}
          </Button>
        </ChakraTooltip>

        <ChakraTooltip
          label="Reset processor"
          hasArrow
        >
          <Button
            leftIcon={<FiRefreshCw />}
            colorScheme="blue"
            onClick={onReset}
            isDisabled={!canReset}
            flex={1}
            aria-label="Reset processor"
          >
            Reset
          </Button>
        </ChakraTooltip>
      </Stack>
    </Box>
  );
};
