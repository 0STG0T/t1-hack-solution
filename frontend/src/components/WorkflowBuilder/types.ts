export interface Position {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  type: string;
  position: Position;
  data: Record<string, any>;
  connections: string[];
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface WorkflowConfig {
  nodes: Node[];
  connections: Connection[];
}
