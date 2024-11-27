import React from 'react';
import { FiX, FiSun, FiMoon, FiImage } from 'react-icons/fi';

interface CustomizationPanelProps {
  onClose: () => void;
  onCustomizationChange?: (customization: {
    primaryColor: string;
    fontFamily: string;
    logo?: File;
  }) => void;
}

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  onClose,
  onCustomizationChange,
}) => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [customization, setCustomization] = React.useState({
    primaryColor: '#3182CE',
    fontFamily: 'Inter',
  });
  const [logoFile, setLogoFile] = React.useState<File | null>(null);

  const handleChange = (
    field: 'primaryColor' | 'fontFamily',
    value: string
  ) => {
    const newCustomization = {
      ...customization,
      [field]: value,
    };
    setCustomization(newCustomization);
    onCustomizationChange?.({ ...newCustomization, logo: logoFile || undefined });
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      onCustomizationChange?.({
        ...customization,
        logo: file,
      });
    }
  };

  const toggleColorMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-96 max-w-full z-50
        transform transition-all duration-300 ease-out
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-md
        border-l border-gray-200/50 dark:border-gray-700/50
        shadow-2xl overflow-y-auto">

        <div className="sticky top-0 z-10 px-6 py-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm
          border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600
              dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Customize Appearance
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-200">
              <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Theme
            </label>
            <button
              onClick={toggleColorMode}
              className="w-full p-3 rounded-xl
                bg-gradient-to-r from-gray-50 to-gray-100
                dark:from-gray-700 dark:to-gray-750
                border border-gray-200/50 dark:border-gray-700/50
                hover:border-blue-300 dark:hover:border-blue-600
                transform transition-all duration-300 hover:scale-102
                flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              {isDarkMode ? (
                <FiMoon className="w-5 h-5 text-purple-500" />
              ) : (
                <FiSun className="w-5 h-5 text-amber-500" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Primary Color
            </label>
            <div className="relative">
              <input
                type="color"
                value={customization.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="w-full h-12 rounded-xl cursor-pointer
                  border border-gray-200/50 dark:border-gray-700/50
                  hover:border-blue-300 dark:hover:border-blue-600
                  transform transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Font Family
            </label>
            <select
              value={customization.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="w-full p-3 rounded-xl bg-white dark:bg-gray-700
                border border-gray-200/50 dark:border-gray-700/50
                hover:border-blue-300 dark:hover:border-blue-600
                text-gray-700 dark:text-gray-300
                transform transition-all duration-300">
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Lato">Lato</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Logo
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="flex items-center justify-center w-full p-3 rounded-xl
                  bg-gradient-to-r from-gray-50 to-gray-100
                  dark:from-gray-700 dark:to-gray-750
                  border border-gray-200/50 dark:border-gray-700/50
                  hover:border-blue-300 dark:hover:border-blue-600
                  cursor-pointer transform transition-all duration-300 hover:scale-102">
                <FiImage className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {logoFile ? logoFile.name : 'Choose Logo'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
