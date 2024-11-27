import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
    Box,
    VStack,
    useColorModeValue,
    Heading,
    Divider,
} from '@chakra-ui/react';
import { DraggableElement } from './DraggableElement';
import { DropZone } from './DropZone';
import { ElementPreview } from './ElementPreview';
import { DragDropProvider, useDragDrop } from './DragDropProvider';

const DragDropContent: React.FC = () => {
    const {
        elements,
        selectedElement,
        addElement,
        updateElement,
        deleteElement,
        selectElement
    } = useDragDrop();

    const bgColor = useColorModeValue('gray.50', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const handleDrop = (item: any, position: { x: number; y: number }) => {
        const newElement = {
            id: `element-${Date.now()}`,
            type: item.type,
            label: item.label || 'New Element',
            position,
            config: item.config || {}
        };
        addElement(newElement);
    };

    return (
        <Box
            display="flex"
            h="100vh"
            bg={bgColor}
            p={4}
            gap={4}
        >
            {/* Toolbox */}
            <VStack
                w="200px"
                bg="white"
                p={4}
                borderRadius="md"
                border="1px"
                borderColor={borderColor}
                spacing={4}
            >
                <Heading size="sm">Elements</Heading>
                <Divider />
                <DraggableElement
                    type="text"
                    label="Text Input"
                    config={{ placeholder: 'Enter text...' }}
                />
                <DraggableElement
                    type="button"
                    label="Button"
                    config={{ text: 'Click me' }}
                />
                <DraggableElement
                    type="select"
                    label="Dropdown"
                    config={{ options: ['Option 1', 'Option 2'] }}
                />
                <DraggableElement
                    type="file"
                    label="File Upload"
                    config={{ accept: '.pdf,.doc,.txt' }}
                />
            </VStack>

            {/* Canvas */}
            <Box flex={1} position="relative">
                <DropZone
                    onDrop={handleDrop}
                    elements={elements}
                    onElementSelect={selectElement}
                    onElementDelete={deleteElement}
                />
            </Box>

            {/* Preview/Properties Panel */}
            <Box
                w="300px"
                bg="white"
                p={4}
                borderRadius="md"
                border="1px"
                borderColor={borderColor}
            >
                <Heading size="sm" mb={4}>Properties</Heading>
                <Divider mb={4} />
                <ElementPreview
                    element={selectedElement}
                    onUpdate={updateElement}
                />
            </Box>
        </Box>
    );
};

const DragDropContainer: React.FC = () => {
    return (
        <DndProvider backend={HTML5Backend}>
            <DragDropProvider>
                <DragDropContent />
            </DragDropProvider>
        </DndProvider>
    );
};

export default DragDropContainer;
