import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  ChakraProvider,
  ThemeConfig,
  useColorMode as useChakraColorMode,
  extendTheme,
} from '@chakra-ui/react';
import { merge } from 'lodash';

interface CustomTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string;
  darkMode: boolean;
}

interface ThemeContextType {
  theme: CustomTheme;
  updateTheme: (updates: Partial<CustomTheme>) => void;
  resetTheme: () => void;
}

const defaultTheme: CustomTheme = {
  primaryColor: '#3182CE',
  secondaryColor: '#4A5568',
  accentColor: '#48BB78',
  fontFamily: 'Inter, sans-serif',
  logoUrl: '',
  darkMode: false,
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  updateTheme: () => {},
  resetTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<CustomTheme>(defaultTheme);
  const { setColorMode } = useChakraColorMode();

  const updateTheme = useCallback((updates: Partial<CustomTheme>) => {
    setTheme(current => {
      const newTheme = { ...current, ...updates };
      // Update color mode when darkMode changes
      if ('darkMode' in updates) {
        setColorMode(newTheme.darkMode ? 'dark' : 'light');
      }
      return newTheme;
    });
  }, [setColorMode]);

  const resetTheme = useCallback(() => {
    setTheme(defaultTheme);
    setColorMode(defaultTheme.darkMode ? 'dark' : 'light');
  }, [setColorMode]);

  const config: ThemeConfig = {
    initialColorMode: theme.darkMode ? 'dark' : 'light',
    useSystemColorMode: false,
  };

  const customTheme = extendTheme({
    colors: {
      primary: {
        500: theme.primaryColor,
      },
      secondary: {
        500: theme.secondaryColor,
      },
      accent: {
        500: theme.accentColor,
      },
    },
    fonts: {
      heading: theme.fontFamily,
      body: theme.fontFamily,
    },
    styles: {
      global: {
        body: {
          bg: theme.darkMode ? 'gray.900' : 'white',
          color: theme.darkMode ? 'white' : 'gray.800',
        },
      },
    },
    config,
  });

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      <ChakraProvider resetCSS theme={customTheme}>
        {children}
      </ChakraProvider>
    </ThemeContext.Provider>
  );
};

// Theme utility functions
export const themeUtils = {
  // Convert hex color to RGB values
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  // Generate a complementary color
  getComplementaryColor: (hex: string): string => {
    const rgb = themeUtils.hexToRgb(hex);
    if (!rgb) return '#000000';

    const { r, g, b } = rgb;
    const complement = {
      r: 255 - r,
      g: 255 - g,
      b: 255 - b,
    };

    return `#${complement.r.toString(16).padStart(2, '0')}${complement.g.toString(16).padStart(2, '0')}${complement.b.toString(16).padStart(2, '0')}`;
  },

  // Check if a color is light or dark
  isLightColor: (hex: string): boolean => {
    const rgb = themeUtils.hexToRgb(hex);
    if (!rgb) return true;

    const { r, g, b } = rgb;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  },

  // Generate a color palette from a base color
  generatePalette: (baseColor: string): Record<string, string> => {
    const rgb = themeUtils.hexToRgb(baseColor);
    if (!rgb) return {};

    const { h, s, l } = themeUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);

    return {
      lighter: themeUtils.hslToHex(h, s, Math.min(l * 1.3, 100)),
      light: themeUtils.hslToHex(h, s, Math.min(l * 1.15, 100)),
      base: baseColor,
      dark: themeUtils.hslToHex(h, s, l * 0.85),
      darker: themeUtils.hslToHex(h, s, l * 0.7),
    };
  },

  // Convert RGB to HSL
  rgbToHsl: (r: number, g: number, b: number): { h: number; s: number; l: number } => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }

      h /= 6;
    }

    return {
      h: h * 360,
      s: s * 100,
      l: l * 100,
    };
  },

  // Convert HSL to Hex
  hslToHex: (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  },
};
