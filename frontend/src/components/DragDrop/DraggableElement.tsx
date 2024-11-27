import React from 'react';
import { useDrag } from 'react-dnd';
import { Box, Text, Icon, HStack, useColorModeValue } from '@chakra-ui/react';
import {
    MdTextFields,
    MdCheckBox,
    MdFileUpload,
    MdMenu
} from 'react-icons/md';
import { ElementConfig } from '../../types/dragDrop';

interface DraggableElementProps {
    type: ElementConfig['type'];
    label: string;
    config: ElementConfig['config'];
}

const getElementIcon = (type: ElementConfig['type']) => {
    switch (type) {
        case 'text':
            return MdTextFields;
        case 'button':
            return MdCheckBox;
        case 'file':
            return MdFileUpload;
        case 'select':
            return MdMenu;
        default:
            return MdTextFields;
    }
};

export const DraggableElement: React.FC<DraggableElementProps> = ({
    type,
    label,
    config
}) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'element',
        item: { type, label, config },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const hoverBorderColor = useColorModeValue('blue.500', 'blue.300');
    const bgColor = useColorModeValue('white', 'gray.800');
    const hoverBgColor = useColorModeValue('blue.50', 'gray.700');

    return (
        <Box
            ref={drag}
            opacity={isDragging ? 0.5 : 1}
            cursor="move"
            p={3}
            bg={bgColor}
            borderRadius="md"
            border="1px"
            borderColor={borderColor}
            _hover={{
                borderColor: hoverBorderColor,
                bg: hoverBgColor,
                transform: 'translateY(-2px)',
                boxShadow: 'md'
            }}
            transition="all 0.2s"
            w="100%"
        >
            <HStack spacing={3}>
                <Icon
                    as={getElementIcon(type)}
                    boxSize={5}
                    color={isDragging ? 'gray.400' : 'blue.500'}
                />
                <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={isDragging ? 'gray.400' : 'inherit'}
                >
                    {label}
                </Text>
            </HStack>
        </Box>
    );
};
