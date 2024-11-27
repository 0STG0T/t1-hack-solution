```typescript
import React from 'react';
import { Handle as ReactFlowHandle, Position } from 'reactflow';

interface HandleProps {
  type: 'source' | 'target';
  position: Position;
  isConnectable?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Handle: React.FC<HandleProps> = ({
  type,
  position,
  isConnectable,
  variant = 'primary'
}) => {
  const baseClasses = `
    w-3 h-3 border-[1.5px] transition-transform duration-300 hover:scale-125
    shadow-lg hover:shadow-xl
  `;

  const variantClasses = {
    primary: `
      !bg-gradient-to-br !from-emerald-400 !to-green-400
      dark:!from-emerald-500 dark:!to-green-500
      !border-white dark:!border-gray-800
    `,
    secondary: `
      !bg-gradient-to-br !from-blue-400 !to-indigo-400
      dark:!from-blue-500 dark:!to-indigo-500
      !border-white dark:!border-gray-800
    `
  };

  return (
    <ReactFlowHandle
      type={type}
      position={position}
      isConnectable={isConnectable}
      className={`${baseClasses} ${variantClasses[variant]}`}
    />
  );
};
```
