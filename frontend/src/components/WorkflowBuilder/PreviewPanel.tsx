import React from 'react';
import { PreviewUpdatePayload } from '../../types/websocket';
import { FiX, FiLoader, FiAlertCircle } from 'react-icons/fi';

interface PreviewPanelProps {
  nodeId?: string;
  nodeType?: string;
  preview?: PreviewUpdatePayload;
  isLoading?: boolean;
  error?: string;
  onClose: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  nodeId,
  nodeType,
  preview,
  isLoading,
  error,
  onClose
}) => {
  if (!nodeId) return null;

  return (
    <div className="
      w-80 glass-effect dark:glass-effect-dark
      border-[1.5px] border-gray-200/30 dark:border-gray-600/30
      rounded-2xl shadow-2xl hover:shadow-3xl
      transition-all duration-500 ease-out
      hover:scale-102 hover:-translate-y-1 hover:rotate-1
      hover:border-blue-200/50 dark:hover:border-blue-600/50
      p-4 space-y-4 animate-fade-in-up
      bg-white/40 dark:bg-gray-800/40
    ">
      <div className="flex justify-between items-center">
        <div className="transform transition-all duration-300 group">
          <h3 className="font-medium text-sm bg-gradient-to-br
            from-blue-600 via-indigo-600 to-purple-600
            dark:from-blue-300 dark:via-indigo-300 dark:to-purple-300
            bg-clip-text text-transparent group-hover:scale-102">Node Preview</h3>
          <span className="text-xs text-gray-500/80 dark:text-gray-400/80 transition-colors duration-300">{nodeType}</span>
        </div>
        <button
          onClick={onClose}
          className="
            w-7 h-7 rounded-full
            bg-gradient-to-br from-white/80 to-gray-50/80
            dark:from-gray-800/80 dark:to-gray-700/80
            border border-gray-200/30 dark:border-gray-600/30
            flex items-center justify-center
            transform transition-all duration-300
            hover:scale-110 hover:rotate-90
            hover:border-red-300/50 dark:hover:border-red-600/50
          "
        >
          <FiX className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {isLoading && (
        <div className="glass-effect dark:glass-effect-dark rounded-xl p-4
          border border-blue-200/30 dark:border-blue-600/30
          transform transition-all duration-500 hover:scale-102">
          <div className="flex items-center justify-center">
            <div className="relative">
              <FiLoader className="w-6 h-6 text-blue-500 dark:text-blue-400 animate-spin" />
              <div className="absolute inset-0 blur-sm bg-blue-400/30 dark:bg-blue-500/30 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-effect-error dark:glass-effect-error-dark rounded-xl p-4
          border border-red-200/30 dark:border-red-600/30
          flex items-start gap-3 transform transition-all duration-500
          hover:scale-102 hover:-translate-y-0.5">
          <FiAlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
          <p className="text-sm text-red-600/90 dark:text-red-300/90">{error}</p>
        </div>
      )}

      {!isLoading && !error && preview && (
        <div className="space-y-3">
          <div className="glass-effect dark:glass-effect-dark rounded-xl p-4
            border border-gray-200/30 dark:border-gray-600/30
            hover:border-blue-200/50 dark:hover:border-blue-600/50
            transform transition-all duration-500 group
            hover:scale-102 hover:-translate-y-0.5">
            <div className="text-sm preview-content whitespace-pre-wrap
              text-gray-700 dark:text-gray-300
              group-hover:text-gray-900 dark:group-hover:text-gray-100
              transition-colors duration-300">
              {preview.preview}
            </div>
          </div>

          {preview.metadata && (
            <div className="glass-effect dark:glass-effect-dark rounded-xl p-4
              border border-gray-200/30 dark:border-gray-600/30
              hover:border-blue-200/50 dark:hover:border-blue-600/50
              transform transition-all duration-500
              hover:scale-102 hover:-translate-y-0.5">
              <h4 className="text-xs font-medium mb-2.5 bg-gradient-to-br
                from-blue-600 via-indigo-600 to-purple-600
                dark:from-blue-300 dark:via-indigo-300 dark:to-purple-300
                bg-clip-text text-transparent">
                Metadata
              </h4>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(preview.metadata).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt className="text-gray-500 dark:text-gray-400">{key}</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
