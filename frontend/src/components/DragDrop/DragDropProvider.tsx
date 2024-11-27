import React, { createContext, useContext, useState, useCallback } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ElementConfig, Position } from '../../types/dragDrop';

interface DragDropContextType {
    elements: ElementConfig[];
    selectedElement: ElementConfig | null;
    addElement: (element: ElementConfig) => void;
    updateElement: (element: ElementConfig) => void;
    deleteElement: (elementId: string) => void;
    selectElement: (element: ElementConfig | null) => void;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export const DragDropProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [elements, setElements] = useState<ElementConfig[]>([]);
    const [selectedElement, setSelectedElement] = useState<ElementConfig | null>(null);
    const { sendMessage } = useWebSocket('ws://localhost:8000/ws');

    const addElement = useCallback((element: ElementConfig) => {
        setElements(prev => [...prev, element]);
        sendMessage({
            type: 'element_added',
            payload: element
        });
    }, [sendMessage]);

    const updateElement = useCallback((element: ElementConfig) => {
        setElements(prev =>
            prev.map(el => el.id === element.id ? element : el)
        );
        sendMessage({
            type: 'element_updated',
            payload: element
        });
    }, [sendMessage]);

    const deleteElement = useCallback((elementId: string) => {
        setElements(prev => prev.filter(el => el.id !== elementId));
        setSelectedElement(null);
        sendMessage({
            type: 'element_deleted',
            payload: { id: elementId }
        });
    }, [sendMessage]);

    const selectElement = useCallback((element: ElementConfig | null) => {
        setSelectedElement(element);
    }, []);

    const value = {
        elements,
        selectedElement,
        addElement,
        updateElement,
        deleteElement,
        selectElement
    };

    return (
        <DragDropContext.Provider value={value}>
            {children}
        </DragDropContext.Provider>
    );
};

export const useDragDrop = () => {
    const context = useContext(DragDropContext);
    if (context === undefined) {
        throw new Error('useDragDrop must be used within a DragDropProvider');
    }
    return context;
};
