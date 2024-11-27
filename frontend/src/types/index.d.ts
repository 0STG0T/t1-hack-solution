declare module '@chakra-ui/react' {
  import { ReactNode } from 'react';

  export interface ThemeConfig {
    initialColorMode: 'light' | 'dark';
    useSystemColorMode: boolean;
  }

  export interface ChakraProviderProps {
    children?: ReactNode;
    theme?: any;
    resetCSS?: boolean;
  }

  export const ChakraProvider: React.FC<ChakraProviderProps>;
  export const useColorMode: () => {
    colorMode: 'light' | 'dark';
    setColorMode: (value: 'light' | 'dark') => void;
  };
  export const extendTheme: (overrides: any) => any;
  export const useBreakpointValue: <T>(values: T) => T;
  export const useMediaQuery: (query: string) => boolean[];
}

declare module 'reactflow' {
  import { ComponentType, ReactNode } from 'react';

  export interface Node<T = any> {
    id: string;
    position: { x: number; y: number };
    data: T;
    type?: string;
  }

  export interface Edge<T = any> {
    id: string;
    source: string;
    target: string;
    type?: string;
    data?: T;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }

  export interface Connection {
    source: string | null;
    target: string | null;
    sourceHandle: string | null;
    targetHandle: string | null;
  }

  export interface NodeProps<T = any> {
    data: T;
    isConnectable: boolean;
  }

  export const Handle: ComponentType<{
    type: 'source' | 'target';
    position: Position;
    isConnectable?: boolean;
  }>;

  export enum Position {
    Left = 'left',
    Right = 'right',
    Top = 'top',
    Bottom = 'bottom'
  }

  export const ReactFlow: ComponentType<{
    nodes: Node[];
    edges: Edge[];
    onNodesChange?: (changes: any) => void;
    onEdgesChange?: (changes: any) => void;
    onConnect?: (params: Connection) => void;
    nodeTypes?: Record<string, ComponentType<NodeProps>>;
    children?: ReactNode;
  }>;

  export const Controls: ComponentType;
  export const Background: ComponentType<{
    variant?: BackgroundVariant;
    gap?: number;
    size?: number;
    color?: string;
    className?: string;
  }>;
  export const MiniMap: ComponentType<MiniMapProps & {
    className?: string;
    maskColor?: string;
  }>;

  export const ReactFlowProvider: ComponentType;
  export type ReactFlowInstance = any;

  export interface MiniMapProps {
    nodeColor?: string | ((node: Node) => string);
    nodeStrokeColor?: string | ((node: Node) => string);
    nodeBorderRadius?: number;
  }

  export enum BackgroundVariant {
    Dots = 'dots',
    Lines = 'lines',
    Cross = 'cross'
  }

  export const useNodesState: (initialNodes?: Node[]) => [Node[], (nodes: Node[]) => void, (changes: any) => void];
  export const useEdgesState: (initialEdges?: Edge[]) => [Edge[], (edges: Edge[]) => void, (changes: any) => void];
  export const addEdge: (connection: Connection, edges: Edge[]) => Edge[];
}
