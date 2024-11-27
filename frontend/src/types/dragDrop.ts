export interface Position {
    x: number;
    y: number;
}

export interface ElementConfig {
    id: string;
    type: 'text' | 'button' | 'select' | 'file';
    label: string;
    position: Position;
    config: {
        placeholder?: string;
        text?: string;
        options?: string[];
        accept?: string;
        style?: {
            width?: string;
            height?: string;
            backgroundColor?: string;
            color?: string;
            fontSize?: string;
            padding?: string;
        };
    };
}

export interface DragItem {
    type: string;
    id: string;
    config: ElementConfig['config'];
}

export interface DropResult {
    position: Position;
}
