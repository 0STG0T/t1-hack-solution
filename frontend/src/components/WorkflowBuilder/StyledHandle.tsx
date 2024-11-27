```typescript
import { Handle, Position } from 'reactflow';
import styled from '@emotion/styled';

export const StyledHandle = styled(Handle)`
  width: 12px;
  height: 12px;
  background: linear-gradient(to bottom right, var(--from-color), var(--to-color));
  border: 1.5px solid var(--border-color);
  transition: transform 300ms;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: scale(1.25);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
`;

interface CustomHandleProps {
  type: 'source' | 'target';
  position: Position;
  isConnectable?: boolean;
  fromColor?: string;
  toColor?: string;
  borderColor?: string;
}

export const CustomHandle: React.FC<CustomHandleProps> = ({
  type,
  position,
  isConnectable,
  fromColor = '#10B981',
  toColor = '#059669',
  borderColor = '#ffffff'
}) => (
  <StyledHandle
    type={type}
    position={position}
    isConnectable={isConnectable}
    style={{
      '--from-color': fromColor,
      '--to-color': toColor,
      '--border-color': borderColor
    } as React.CSSProperties}
  />
);
```
