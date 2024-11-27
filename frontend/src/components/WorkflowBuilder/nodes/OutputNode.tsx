import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FiDatabase } from 'react-icons/fi';

interface OutputNodeData {
  label: string;
  type: string;
  outputType?: string;
}

export const OutputNode = memo<NodeProps<OutputNodeData>>(({ data, isConnectable }) => {
  return (
    <div className="group relative transform transition-all duration-300 hover:scale-102">
      <div className="relative p-4 min-w-[200px] rounded-xl
        bg-gradient-to-br from-purple-50/90 to-fuchsia-100/90
        dark:from-purple-900/20 dark:to-fuchsia-800/20
        border border-purple-200/50 dark:border-purple-700/50
        shadow-lg hover:shadow-xl backdrop-blur-sm
        transition-all duration-300
        hover:border-purple-300/50 dark:hover:border-purple-600/50">

        <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10
          rounded-xl blur-lg group-hover:blur-xl transition-all duration-300 -z-10"/>

        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800"
        />

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80
            group-hover:scale-110 transform transition-all duration-300
            border border-purple-200/30 dark:border-purple-700/30">
            <FiDatabase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-medium text-sm bg-gradient-to-br from-purple-700 to-fuchsia-600
            dark:from-purple-300 dark:to-fuchsia-400 bg-clip-text text-transparent">
            {data.label}
          </span>
        </div>
      </div>
    </div>
  );
});

OutputNode.displayName = 'OutputNode';
