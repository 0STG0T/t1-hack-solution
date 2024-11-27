import { ComponentType, CSSProperties, ReactNode } from 'react';

declare module 'reactflow' {
  export interface NodeData {
    type: string;
    label?: string;
    preview?: any;
    [key: string]: any;
  }

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
    id: string;
    data: T;
    isConnectable: boolean;
    selected?: boolean;
    className?: string;
  }

  export interface HandleProps {
    type: 'source' | 'target';
    position: Position;
    isConnectable?: boolean;
    className?: string;
    style?: CSSProperties;
  }

  export const Handle: ComponentType<HandleProps>;

  export enum Position {
    Left = 'left',
    Right = 'right',
    Top = 'top',
    Bottom = 'bottom'
  }

  export type NodeTypes = Record<string, ComponentType<NodeProps>>;

  export type OnNodesChange = (changes: NodeChange[]) => void;
  export type OnEdgesChange = (changes: EdgeChange[]) => void;
  export type OnConnect = (params: Connection) => void;

  export interface ReactFlowProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange?: OnNodesChange;
    onEdgesChange?: OnEdgesChange;
    onConnect?: OnConnect;
    onInit?: (instance: ReactFlowInstance) => void;
    nodeTypes?: NodeTypes;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
    onNodeClick?: (event: React.MouseEvent, node: Node) => void;
    onNodeDragStart?: () => void;
    onNodeDragStop?: () => void;
    fitView?: boolean;
    minZoom?: number;
    maxZoom?: number;
  }

  export interface NodeChange {
    id: string;
    type: 'position' | 'dimensions' | 'select' | 'remove';
    position?: { x: number; y: number };
    dimensions?: { width: number; height: number };
    selected?: boolean;
  }

  export interface EdgeChange {
    id: string;
    type: 'select' | 'remove';
    selected?: boolean;
  }

  export const ReactFlow: ComponentType<ReactFlowProps>;
  export const Controls: ComponentType<{ className?: string; style?: CSSProperties }>;
  export const Background: ComponentType<{
    variant?: BackgroundVariant;
    gap?: number;
    size?: number;
    color?: string;
    className?: string;
    style?: CSSProperties;
  }>;
  export const MiniMap: ComponentType<{
    nodeColor?: string | ((node: Node) => string);
    nodeStrokeColor?: string | ((node: Node) => string);
    nodeBorderRadius?: number;
    className?: string;
    style?: CSSProperties;
    maskColor?: string;
  }>;

  export const ReactFlowProvider: ComponentType<{ children: ReactNode }>;
  export type ReactFlowInstance = any;

  export enum BackgroundVariant {
    Dots = 'dots',
    Lines = 'lines',
    Cross = 'cross'
  }

  export const useNodesState: (initialNodes?: Node[]) => [Node[], (nodes: Node[] | ((prev: Node[]) => Node[])) => void, (changes: NodeChange[]) => void];
  export const useEdgesState: (initialEdges?: Edge[]) => [Edge[], (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void, (changes: EdgeChange[]) => void];
  export const addEdge: (connection: Connection, edges: Edge[]) => Edge[];
}
