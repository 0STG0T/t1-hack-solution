import React, { useState } from 'react';
import {
  Box,
  VStack,
  Tabs,
  TabList as ChakraTabList,
  TabPanels as ChakraTabPanels,
  Tab as ChakraTab,
  TabPanel as ChakraTabPanel,
  useColorMode,
} from '@chakra-ui/react';
import { DocumentUpload } from '../DocumentUpload';
import { UrlInput } from '../UrlInput';
import { WorkflowBuilder } from '../WorkflowBuilder/WorkflowBuilder';

export const ProcessorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'light' ? 'white' : 'gray.800';
  const borderColor = colorMode === 'light' ? 'gray.200' : 'gray.700';

  const handleDocumentUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/process/document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      const result = await response.json();
      console.log('Document processed:', result);
    } catch (error) {
      console.error('Error processing document:', error);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    const formData = new FormData();
    formData.append('url', url);

    try {
      const response = await fetch('http://localhost:8000/api/process/url', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process URL');
      }

      const result = await response.json();
      console.log('URL processed:', result);
    } catch (error) {
      console.error('Error processing URL:', error);
    }
  };

  return (
    <Box
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      p={4}
      height="100%"
      overflow="hidden"
    >
      <Tabs
        isFitted
        variant="enclosed"
        onChange={(index) => setActiveTab(index)}
        height="100%"
      >
        <ChakraTabList mb={4}>
          <ChakraTab>Documents</ChakraTab>
          <ChakraTab>URLs</ChakraTab>
          <ChakraTab>Workflow</ChakraTab>
        </ChakraTabList>

        <ChakraTabPanels height="calc(100% - 44px)">
          <ChakraTabPanel height="100%" p={0}>
            <DocumentUpload onUpload={handleDocumentUpload} />
          </ChakraTabPanel>
          <ChakraTabPanel height="100%" p={0}>
            <UrlInput onSubmit={handleUrlSubmit} />
          </ChakraTabPanel>
          <ChakraTabPanel height="100%" p={0}>
            <WorkflowBuilder />
          </ChakraTabPanel>
        </ChakraTabPanels>
      </Tabs>
    </Box>
  );
};
