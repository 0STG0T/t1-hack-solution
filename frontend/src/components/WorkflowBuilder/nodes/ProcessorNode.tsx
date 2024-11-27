import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FiCpu } from 'react-icons/fi';

interface ProcessorNodeData {
  label: string;
  type: string;
  config?: Record<string, any>;
}

export const ProcessorNode = memo<NodeProps<ProcessorNodeData>>(({ data, isConnectable }) => {
  return (
    <div className="group relative transform transition-all duration-300 hover:scale-102">
      <div className="relative p-4 min-w-[200px] rounded-xl
        bg-gradient-to-br from-blue-50/90 to-indigo-100/90
        dark:from-blue-900/20 dark:to-indigo-800/20
        border border-blue-200/50 dark:border-blue-700/50
        shadow-lg hover:shadow-xl backdrop-blur-sm
        transition-all duration-300
        hover:border-blue-300/50 dark:hover:border-blue-600/50">

        <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/10 to-indigo-500/10
          rounded-xl blur-lg group-hover:blur-xl transition-all duration-300 -z-10"/>

        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800"
        />

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80
            group-hover:scale-110 transform transition-all duration-300
            border border-blue-200/30 dark:border-blue-700/30">
            <FiCpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium text-sm bg-gradient-to-br from-blue-700 to-indigo-600
            dark:from-blue-300 dark:to-indigo-400 bg-clip-text text-transparent">
            {data.label}
          </span>
        </div>

        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800"
        />
      </div>
    </div>
  );
});

ProcessorNode.displayName = 'ProcessorNode';
