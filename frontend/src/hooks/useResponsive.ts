import { useBreakpointValue as useChakraBreakpointValue } from '@chakra-ui/react';

interface ResponsiveConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeScreen: boolean;
  currentBreakpoint: string;
  shouldShowSidebar: boolean;
  sidebarWidth: string;
  contentMaxWidth: string;
  toolbarHeight: string;
}

type BreakpointValue<T> = {
  base: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
};

const useBreakpointValue = <T>(values: BreakpointValue<T>, fallback: T): T => {
  return useChakraBreakpointValue(values) ?? fallback;
};

export const useResponsive = (): ResponsiveConfig => {
  const isMobileDevice = useBreakpointValue({ base: true, md: false }, false);
  const isTabletDevice = useBreakpointValue({ base: false, md: true, lg: false }, false);
  const isDesktopDevice = useBreakpointValue({ base: false, lg: true }, false);
  const isLargeScreenDevice = useBreakpointValue({ base: false, xl: true }, false);

  const breakpoint = useBreakpointValue({
    base: 'mobile',
    sm: 'mobile',
    md: 'tablet',
    lg: 'desktop',
    xl: 'largeScreen',
  }, 'mobile');

  const width = useBreakpointValue({
    base: '100%',
    sm: '100%',
    md: '280px',
    lg: '300px',
    xl: '320px',
  }, '300px');

  const maxWidth = useBreakpointValue({
    base: '100%',
    sm: '100%',
    md: 'calc(100% - 280px)',
    lg: 'calc(100% - 300px)',
    xl: '1200px',
  }, 'calc(100% - 300px)');

  const height = useBreakpointValue({
    base: '56px',
    sm: '56px',
    md: '64px',
    lg: '72px',
    xl: '72px',
  }, '64px');

  const isPortrait = typeof window !== 'undefined'
    ? useBreakpointValue({ base: window.innerHeight > window.innerWidth }, false)
    : false;

  return {
    isMobile: isMobileDevice,
    isTablet: isTabletDevice,
    isDesktop: isDesktopDevice,
    isLargeScreen: isLargeScreenDevice,
    currentBreakpoint: breakpoint,
    shouldShowSidebar: !isMobileDevice,
    sidebarWidth: width,
    contentMaxWidth: maxWidth,
    toolbarHeight: height,
  };
};

// Responsive breakpoint constants
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 1024,
  desktop: 1440,
  largeScreen: 1920,
};

// Responsive layout constants
export const LAYOUT = {
  sidebarCollapsedWidth: '72px',
  sidebarExpandedWidth: '300px',
  topbarHeight: '64px',
  bottombarHeight: '56px',
  containerPadding: {
    mobile: '16px',
    tablet: '24px',
    desktop: '32px',
  },
  maxContentWidth: '1200px',
};

// Helper functions for responsive calculations
export const responsiveHelpers = {
  getPadding: (breakpoint: string): string => {
    return LAYOUT.containerPadding[breakpoint as keyof typeof LAYOUT.containerPadding] || LAYOUT.containerPadding.mobile;
  },

  getContentWidth: (windowWidth: number, sidebarExpanded: boolean): string => {
    const sidebarWidth = sidebarExpanded
      ? parseInt(LAYOUT.sidebarExpandedWidth)
      : parseInt(LAYOUT.sidebarCollapsedWidth);

    if (windowWidth <= BREAKPOINTS.mobile) {
      return '100%';
    }

    const contentWidth = windowWidth - sidebarWidth;
    return `${Math.min(contentWidth, parseInt(LAYOUT.maxContentWidth))}px`;
  },

  calculateGridColumns: (containerWidth: number, minItemWidth: number = 300): number => {
    return Math.max(1, Math.floor(containerWidth / minItemWidth));
  },

  getFontSize: (base: number, scale: number = 1.2): Record<string, string> => {
    return {
      mobile: `${base}px`,
      tablet: `${base * scale}px`,
      desktop: `${base * scale * scale}px`,
    };
  },
};

// Touch device detection
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Orientation detection
export const useOrientation = () => {
  const isPortrait = typeof window !== 'undefined'
    ? useBreakpointValue({ base: window.innerHeight > window.innerWidth }, false)
    : false;
  return {
    isPortrait,
    isLandscape: !isPortrait,
  };
};
