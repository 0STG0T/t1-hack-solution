import React, { useRef, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { ElementConfig, Position, DragItem } from '../../types/dragDrop';
import { DroppedElement } from './DroppedElement';

interface DropZoneProps {
    onDrop: (item: DragItem, position: Position) => void;
    elements: ElementConfig[];
    onElementSelect: (element: ElementConfig) => void;
    onElementDelete: (elementId: string) => void;
}

const GRID_SIZE = 20;

export const DropZone: React.FC<DropZoneProps> = ({
    onDrop,
    elements,
    onElementSelect,
    onElementDelete,
}) => {
    const dropRef = useRef<HTMLDivElement>(null);
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const hoverBorderColor = useColorModeValue('blue.500', 'blue.300');
    const bgColor = useColorModeValue('white', 'gray.800');
    const gridColor = useColorModeValue('gray.100', 'gray.700');

    const calculateGridPosition = useCallback((clientX: number, clientY: number): Position => {
        if (!dropRef.current) return { x: 0, y: 0 };

        const rect = dropRef.current.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        const x = clientX - rect.left - scrollLeft;
        const y = clientY - rect.top - scrollTop;

        return {
            x: Math.round(x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(y / GRID_SIZE) * GRID_SIZE,
        };
    }, []);

    const [{ isOver }, drop] = useDrop(() => ({
        accept: ['element', 'placed-element'],
        drop: (item: DragItem, monitor) => {
            const clientOffset = monitor.getClientOffset();
            if (clientOffset) {
                const position = calculateGridPosition(clientOffset.x, clientOffset.y);
                onDrop(item, position);
            }
            return undefined;
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }));

    const setRefs = (el: HTMLDivElement) => {
        dropRef.current = el;
        drop(el);
    };

    return (
        <Box
            ref={setRefs}
            w="100%"
            h="100%"
            minH="600px"
            bg={bgColor}
            border="2px"
            borderStyle="dashed"
            borderColor={isOver ? hoverBorderColor : borderColor}
            borderRadius="md"
            position="relative"
            transition="all 0.2s"
            sx={{
                backgroundImage: `radial-gradient(${gridColor} 1px, transparent 1px)`,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                backgroundPosition: '0 0',
            }}
            _before={{
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                opacity: isOver ? 0.1 : 0,
                bg: 'blue.500',
                transition: 'opacity 0.2s',
            }}
        >
            {elements.map((element) => (
                <DroppedElement
                    key={element.id}
                    element={element}
                    onSelect={() => onElementSelect(element)}
                    onDelete={() => onElementDelete(element.id)}
                />
            ))}
        </Box>
    );
};
