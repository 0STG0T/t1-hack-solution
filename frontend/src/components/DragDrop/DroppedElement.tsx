import React, { useCallback } from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { ElementConfig } from '../../types/dragDrop';
import { useDrag, DragSourceMonitor } from 'react-dnd';
import { useTheme } from '@chakra-ui/react';

interface DroppedElementProps {
    element: ElementConfig;
    onSelect: () => void;
    onDelete: () => void;
}

export const DroppedElement: React.FC<DroppedElementProps> = ({
    element,
    onSelect,
    onDelete,
}) => {
    const theme = useTheme();
    const borderColor = theme.colors.gray[200];
    const hoverBg = theme.colors.gray[50];

    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'placed-element',
        item: element,
        collect: (monitor: DragSourceMonitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const renderElement = useCallback(() => {
        const baseStyle = {
            ...element.config.style,
            width: element.config.style?.width || '200px',
            height: element.config.style?.height || 'auto',
            fontSize: element.config.style?.fontSize || '14px',
            backgroundColor: element.config.style?.backgroundColor || 'white',
            color: element.config.style?.color || 'black',
        };

        switch (element.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        placeholder={element.config.placeholder}
                        style={baseStyle}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                );
            case 'button':
                return (
                    <button
                        style={baseStyle}
                        className="px-4 py-2 rounded hover:opacity-90 transition-opacity"
                    >
                        {element.config.text || 'Button'}
                    </button>
                );
            case 'select':
                return (
                    <select
                        style={baseStyle}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {element.config.options?.map((option, index) => (
                            <option key={index} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                );
            case 'file':
                return (
                    <input
                        type="file"
                        accept={element.config.accept}
                        style={baseStyle}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                );
            default:
                return null;
        }
    }, [element]);

    return (
        <Box
            ref={drag}
            position="absolute"
            left={element.position.x}
            top={element.position.y}
            opacity={isDragging ? 0.5 : 1}
            cursor="move"
            onClick={onSelect}
            _hover={{
                '& > .element-controls': { opacity: 1 },
                bg: hoverBg,
            }}
            border="1px"
            borderColor={borderColor}
            borderRadius="md"
            p={2}
        >
            {renderElement()}
            <Box
                className="element-controls"
                position="absolute"
                top="-20px"
                right="0"
                opacity={0}
                transition="opacity 0.2s"
                bg="white"
                borderRadius="md"
                boxShadow="sm"
            >
                <IconButton
                    aria-label="Delete element"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                />
            </Box>
        </Box>
    );
};
