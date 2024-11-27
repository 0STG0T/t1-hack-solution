import { ReactNode, useState, useEffect } from 'react';
import { FiSun, FiMoon, FiMenu, FiSettings } from 'react-icons/fi';
import { WorkflowBuilder } from './WorkflowBuilder';
import { CustomizationPanel } from './CustomizationPanel';
import { SearchContainer } from './Search';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const NavContent = () => (
    <>
      <button
        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-full transition-all duration-200
          bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200
          hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md"
        onClick={toggleDarkMode}
      >
        {isDarkMode ?
          <FiSun className="w-4 h-4 md:mr-2" /> :
          <FiMoon className="w-4 h-4 md:mr-2" />
        }
        {!isMobile && (isDarkMode ? 'Light Mode' : 'Dark Mode')}
      </button>
      <button
        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-full transition-all duration-200
          bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md"
        onClick={() => setShowCustomization(true)}
      >
        <FiSettings className="w-4 h-4 md:mr-2" />
        {!isMobile && 'Customize'}
      </button>
    </>
  );

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      <header className={`sticky top-0 z-10 backdrop-blur-md bg-opacity-90 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <h1 className={`text-xl font-bold bg-gradient-to-r ${
                isDarkMode
                  ? 'from-blue-400 to-purple-400'
                  : 'from-blue-600 to-purple-600'
              } bg-clip-text text-transparent`}>
                Knowledge Window
              </h1>
            </div>

            {isMobile ? (
              <>
                <button
                  className="p-2 rounded-full text-gray-700 dark:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(true)}
                >
                  <FiMenu className="h-5 w-5" />
                </button>

                {isMenuOpen && (
                  <div className="fixed inset-0 z-50 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <div className={`absolute right-0 top-0 h-full w-64 transform transition-transform duration-300 ${
                      isDarkMode ? 'bg-gray-800' : 'bg-white'
                    } shadow-2xl`}>
                      <div className="p-4">
                        <div className="flex justify-end">
                          <button
                            className="p-2 rounded-full text-gray-700 dark:text-gray-200
                              hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="mt-4 space-y-4">
                          <NavContent />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <NavContent />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8 lg:space-y-12">
          <SearchContainer />
          <WorkflowBuilder />
          {children}
        </div>
      </main>

      {showCustomization && (
        <CustomizationPanel
          isOpen={showCustomization}
          onClose={() => setShowCustomization(false)}
        />
      )}
    </div>
  );
};
