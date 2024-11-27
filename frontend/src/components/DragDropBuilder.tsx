import React, { useState } from 'react';

interface BuilderElement {
  id: string;
  type: string;
  content: string;
  position: { x: number; y: number };
}

export const DragDropBuilder = () => {
  const [elements, setElements] = useState<BuilderElement[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setElements([...elements, {
      id: Date.now().toString(),
      type: 'text',
      content: 'New Element',
      position,
    }]);
  };

  return (
    <div
      className="w-full h-[600px] bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {elements.map((element) => (
        <div
          key={element.id}
          className="absolute p-2 bg-blue-50 dark:bg-blue-900 rounded-md cursor-move"
          style={{
            left: `${element.position.x}px`,
            top: `${element.position.y}px`,
          }}
          draggable
        >
          {element.content}
        </div>
      ))}
    </div>
  );
};
