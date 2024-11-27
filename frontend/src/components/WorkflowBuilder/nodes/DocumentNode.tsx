import { memo } from 'react';
import { Position, NodeProps } from 'reactflow';
import { FiFile, FiFileText } from 'react-icons/fi';
import { CustomHandle } from '../StyledHandle';

interface DocumentNodeData {
  label: string;
  type: string;
  fileType?: string;
}

export const DocumentNode = memo<NodeProps<DocumentNodeData>>(({ data, isConnectable }) => {
  return (
    <div className="group relative transform transition-all duration-500 ease-out
      hover:scale-103 hover:-translate-y-1 hover:rotate-1">
      <div className="relative p-4 min-w-[220px] rounded-2xl
        glass-effect dark:glass-effect-dark
        border-[1.5px] border-emerald-200/30 dark:border-emerald-600/30
        shadow-2xl hover:shadow-3xl backdrop-blur-xl
        transition-all duration-500 ease-out
        hover:border-emerald-300/50 dark:hover:border-emerald-500/50
        group-hover:bg-white/90 dark:group-hover:bg-gray-800/90">

        <div className="absolute -inset-[1px] bg-gradient-to-br
          from-emerald-500/20 via-green-500/20 to-teal-500/20
          dark:from-emerald-400/10 dark:via-green-400/10 dark:to-teal-400/10
          rounded-2xl blur-xl group-hover:blur-2xl group-hover:opacity-75
          transition-all duration-500 ease-out -z-10"/>

        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl
            bg-gradient-to-br from-white/90 to-gray-50/90
            dark:from-gray-800/90 dark:to-gray-700/90
            border-[1.5px] border-emerald-200/30 dark:border-emerald-600/30
            shadow-lg group-hover:shadow-xl
            transform transition-all duration-500 ease-out
            group-hover:scale-110 group-hover:rotate-6">
            <div className="relative">
              <FiFile className="w-5 h-5 text-emerald-500 dark:text-emerald-400
                transition-all duration-500 ease-out
                group-hover:opacity-0" />
              <FiFileText className="w-5 h-5 text-emerald-500 dark:text-emerald-400
                absolute inset-0 opacity-0 transition-all duration-500 ease-out
                group-hover:opacity-100" />
            </div>
          </div>
          <span className="font-medium text-sm bg-gradient-to-br
            from-emerald-700 via-green-600 to-teal-600
            dark:from-emerald-300 dark:via-green-400 dark:to-teal-400
            bg-clip-text text-transparent">
            {data.label}
          </span>
        </div>

        <CustomHandle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          fromColor="#10B981"
          toColor="#059669"
        />
      </div>
    </div>
  );
});

DocumentNode.displayName = 'DocumentNode';
