import { FiFile, FiGlobe, FiDatabase, FiSettings, FiBox } from 'react-icons/fi';
import { IconType } from 'react-icons';

export interface NodeConfig {
  id: string;
  label: string;
  icon: IconType;
  description: string;
  inputs: {
    type: string;
    label: string;
    required: boolean;
    options?: string[];
    config?: {
      acceptedTypes?: string[];
      maxSize?: number;
      validation?: RegExp;
    };
  }[];
  outputs: {
    type: string;
    label: string;
    format?: string;
  }[];
  maxInputs: number;
  maxOutputs: number;
  processFunction?: string;
  config?: {
    processingOptions?: {
      extractText?: boolean;
      vectorize?: boolean;
      language?: string;
      summarize?: boolean;
      metadata?: boolean;
    };
    storageOptions?: {
      collection?: string;
      indexing?: boolean;
      compression?: boolean;
    };
  };
}

export const nodeConfigs: Record<string, NodeConfig> = {
  'document-input': {
    id: 'document-input',
    label: 'Document Input',
    icon: FiFile,
    description: 'Process PDF, DOCX, or TXT files',
    inputs: [
      {
        type: 'file',
        label: 'Document',
        required: true,
        options: ['.pdf', '.docx', '.txt'],
      },
    ],
    outputs: [
      {
        type: 'document',
        label: 'Processed Document',
      },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    processFunction: 'processDocument',
  },
  'url-input': {
    id: 'url-input',
    label: 'URL Input',
    icon: FiGlobe,
    description: 'Process web pages, Notion, or Confluence',
    inputs: [
      {
        type: 'url',
        label: 'URL',
        required: true,
      },
    ],
    outputs: [
      {
        type: 'document',
        label: 'Processed Content',
      },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    processFunction: 'processURL',
  },
  'notion-input': {
    id: 'notion-input',
    label: 'Notion Input',
    icon: FiDatabase,
    description: 'Process Notion pages and databases',
    inputs: [
      {
        type: 'url',
        label: 'Notion URL',
        required: true,
        config: {
          validation: /^https:\/\/(www\.)?notion\.so\/.+$/,
        },
      },
    ],
    outputs: [
      {
        type: 'document',
        label: 'Processed Notion Content',
      },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    processFunction: 'processNotion',
  },
  'confluence-input': {
    id: 'confluence-input',
    label: 'Confluence Input',
    icon: FiDatabase,
    description: 'Process Confluence pages',
    inputs: [
      {
        type: 'url',
        label: 'Confluence URL',
        required: true,
        config: {
          validation: /^https:\/\/.+\/confluence\/.+$/,
        },
      },
    ],
    outputs: [
      {
        type: 'document',
        label: 'Processed Confluence Content',
      },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    processFunction: 'processConfluence',
  },
  'processor': {
    id: 'processor',
    label: 'Processor',
    icon: FiSettings,
    description: 'Transform and analyze content',
    inputs: [
      {
        type: 'document',
        label: 'Input Document',
        required: true,
      },
    ],
    outputs: [
      {
        type: 'document',
        label: 'Processed Output',
        format: 'json',
      },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    processFunction: 'processContent',
    config: {
      processingOptions: {
        extractText: true,
        vectorize: true,
        language: 'auto',
        summarize: false,
        metadata: true,
      },
    },
  },
  'storage': {
    id: 'storage',
    label: 'Storage',
    icon: FiDatabase,
    description: 'Save processed content',
    inputs: [
      {
        type: 'document',
        label: 'Content to Store',
        required: true,
      },
    ],
    outputs: [],
    maxInputs: 1,
    maxOutputs: 0,
    processFunction: 'storeContent',
  },
  'custom': {
    id: 'custom',
    label: 'Custom Node',
    icon: FiBox,
    description: 'Create custom processing logic',
    inputs: [
      {
        type: 'any',
        label: 'Input',
        required: true,
      },
    ],
    outputs: [
      {
        type: 'any',
        label: 'Output',
      },
    ],
    maxInputs: 3,
    maxOutputs: 3,
  },
};

export const getNodeConfig = (type: string): NodeConfig => {
  return nodeConfigs[type] || nodeConfigs['custom'];
};

export const validateConnection = (
  sourceType: string,
  targetType: string,
  sourceHandle: string,
  targetHandle: string
): boolean => {
  const sourceConfig = getNodeConfig(sourceType);
  const targetConfig = getNodeConfig(targetType);

  if (!sourceConfig || !targetConfig) {
    return false;
  }

  // Check if nodes can accept more connections
  if (sourceConfig.maxOutputs === 0 || targetConfig.maxInputs === 0) {
    return false;
  }

  // Validate connection types
  const sourceOutput = sourceConfig.outputs.find(output => output.type === sourceHandle);
  const targetInput = targetConfig.inputs.find(input => input.type === targetHandle);

  if (!sourceOutput || !targetInput) {
    return false;
  }

  // Check format compatibility if specified
  if (sourceOutput.format && targetInput.config?.acceptedTypes) {
    if (!targetInput.config.acceptedTypes.includes(sourceOutput.format)) {
      return false;
    }
  }

  // Allow connections if types match or if either is 'any'
  return sourceOutput.type === targetInput.type ||
         sourceOutput.type === 'any' ||
         targetInput.type === 'any';
};
