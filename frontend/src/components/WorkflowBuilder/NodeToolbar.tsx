import React, { useState } from 'react';
import { FiFile, FiGlobe, FiDatabase, FiSettings, FiGrid } from 'react-icons/fi';

interface NodeType {
  type: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const nodeTypes: NodeType[] = [
  { type: 'document-input', label: 'Document Input', icon: FiFile, description: 'Import and process PDF, DOCX, or TXT files automatically' },
  { type: 'url-input', label: 'URL Input', icon: FiGlobe, description: 'Connect to web content, Notion pages, or Confluence docs' },
  { type: 'processor', label: 'Text Processor', icon: FiSettings, description: 'Advanced text analysis and content processing' },
  { type: 'storage', label: 'Knowledge Base', icon: FiDatabase, description: 'Secure document storage with vector embeddings' },
];

export const NodeToolbar: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="relative group">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          absolute -right-3 top-2 w-7 h-7
          bg-gradient-to-br from-white/80 to-gray-50/80
          dark:from-gray-800/80 dark:to-gray-700/80
          border-[1.5px] border-gray-200/30 dark:border-gray-600/30 rounded-full
          shadow-lg hover:shadow-xl
          transform transition-all duration-500 ease-out
          hover:scale-110 hover:-translate-y-0.5 hover:rotate-180
          hover:border-blue-300 dark:hover:border-blue-600
          backdrop-blur-lg z-20
          animate-glow
        `}
      >
        <FiGrid className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400
          transition-transform duration-500" />
      </button>

      <div className={`
        transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
        ${isExpanded ? 'translate-x-0 opacity-100 scale-100' : '-translate-x-24 opacity-0 scale-95'}
        w-72 glass-effect dark:glass-effect-dark
        rounded-2xl border-[1.5px] border-gray-200/30 dark:border-gray-600/30
        shadow-2xl hover:shadow-3xl backdrop-blur-xl
        hover:glass-effect-hover dark:hover:glass-effect-dark-hover
        p-4 space-y-4
      `}>
        <div className="flex items-center gap-2.5 pl-1">
          <FiGrid className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin-slow" />
          <span className="font-medium text-sm bg-gradient-to-br
            from-blue-500 via-indigo-500 to-purple-500
            dark:from-blue-300 dark:via-indigo-300 dark:to-purple-300
            bg-clip-text text-transparent animate-pulse-subtle">
            Available Nodes
          </span>
        </div>

        <div className="space-y-2.5">
          {nodeTypes.map((node, index) => (
            <div
              key={node.type}
              className="relative group/node"
              onMouseEnter={() => setHoveredNode(node.type)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                className={`
                  flex items-center gap-3.5 p-3.5 rounded-xl cursor-grab active:cursor-grabbing
                  glass-effect dark:glass-effect-dark
                  border-[1.5px] border-transparent
                  hover:glass-effect-hover dark:hover:glass-effect-dark-hover
                  transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                  hover:scale-105 hover:-translate-y-1.5 hover:rotate-1
                  group-hover/node:shadow-2xl
                  ${hoveredNode === node.type ? 'scale-105 -translate-y-1.5 rotate-1 shadow-2xl ring-2 ring-blue-400/30 animate-float-1' : 'animate-float-0'}
                  animate-fade-in-up
                `}
              >
                <div className={`
                  p-2.5 rounded-xl
                  glass-effect dark:glass-effect-dark
                  transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                  group-hover/node:scale-110 group-hover/node:rotate-6
                  ${hoveredNode === node.type ? 'scale-110 rotate-6 animate-pulse-border' : ''}
                `}>
                  <node.icon className={`
                    w-5 h-5 transition-all duration-500
                    ${hoveredNode === node.type
                      ? 'text-blue-500 dark:text-blue-400 animate-glow'
                      : 'text-blue-400 dark:text-blue-300'
                    }
                  `} />
                </div>
                <span className="text-sm font-medium bg-gradient-to-br from-gray-900 via-gray-700 to-gray-800
                  dark:from-gray-100 dark:via-gray-200 dark:to-gray-300
                  bg-clip-text text-transparent">
                  {node.label}
                </span>
              </div>

              {hoveredNode === node.type && (
                <div className="absolute left-full ml-3 top-0 z-20 w-64 p-4
                  glass-effect dark:glass-effect-dark
                  border-[1.5px] border-blue-200/30 dark:border-blue-600/30
                  shadow-2xl backdrop-blur-xl
                  transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                  text-sm text-gray-600 dark:text-gray-300 leading-relaxed
                  animate-float-2
                  hover:scale-105 hover:-translate-y-1 hover:rotate-1
                  hover:glass-effect-hover dark:hover:glass-effect-dark-hover"
                >
                  <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-br
                      from-blue-400/20 via-indigo-400/20 to-purple-400/20
                      dark:from-blue-400/10 dark:via-indigo-400/10 dark:to-purple-400/10
                      rounded-xl blur-2xl -z-10 animate-pulse"/>
                    <div className="animate-fade-in">
                      {node.description}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
