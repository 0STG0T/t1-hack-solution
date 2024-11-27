import React, { useState } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  toolbar?: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  sidebar,
  content,
  toolbar,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useResponsive();

  const SidebarContent = (
    <div className="
      fixed h-full w-[300px]
      glass-effect dark:glass-effect-dark
      border-r border-gray-200/30 dark:border-gray-600/30
      shadow-2xl animate-fade-in-up
      overflow-y-auto
    ">
      {sidebar}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile nav button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="
            fixed top-4 left-4 z-20
            p-2.5 rounded-xl
            glass-effect dark:glass-effect-dark
            border border-gray-200/30 dark:border-gray-600/30
            shadow-lg hover:shadow-xl
            transform transition-all duration-300
            hover:scale-110 hover:-translate-y-0.5
            group
          "
        >
          {isOpen ? (
            <FiX className="w-5 h-5 text-gray-700 dark:text-gray-200 group-hover:rotate-90 transition-transform duration-300" />
          ) : (
            <FiMenu className="w-5 h-5 text-gray-700 dark:text-gray-200 group-hover:rotate-180 transition-transform duration-300" />
          )}
        </button>
      )}

      {/* Sidebar */}
      {isMobile ? (
        <div className={`
          fixed inset-0 z-10 transition-all duration-500 ease-out
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}>
          {/* Backdrop */}
          <div
            className={`
              absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm
              transition-opacity duration-500
              ${isOpen ? 'opacity-100' : 'opacity-0'}
            `}
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar panel */}
          <div className={`
            fixed left-0 top-0 h-full w-[300px]
            glass-effect dark:glass-effect-dark
            shadow-2xl
            transform transition-all duration-500 ease-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            {sidebar}
          </div>
        </div>
      ) : (
        SidebarContent
      )}

      {/* Main content */}
      <div className={`
        transition-all duration-500 ease-out
        ${isMobile ? 'ml-0' : 'ml-[300px]'}
        p-4 space-y-4
      `}>
        {/* Toolbar */}
        {toolbar && (
          <div className="
            sticky top-4 z-10
            glass-effect dark:glass-effect-dark
            border border-gray-200/30 dark:border-gray-600/30
            rounded-2xl shadow-xl
            p-4 mb-4
            animate-fade-in-up
          ">
            {toolbar}
          </div>
        )}

        {/* Content */}
        <div className="
          glass-effect dark:glass-effect-dark
          border border-gray-200/30 dark:border-gray-600/30
          rounded-2xl shadow-xl
          p-4 min-h-[calc(100vh-120px)]
          animate-fade-in-up
        ">
          {content}
        </div>
      </div>
    </div>
  );
};
