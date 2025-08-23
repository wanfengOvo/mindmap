import { useReducer } from 'react';
import { MindMapContext, mindMapReducer, initialData } from './MindMapContext';
import type { ReactNode } from 'react';

export const MindMapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(mindMapReducer, initialData);

  return (
    <MindMapContext.Provider value={{ state, dispatch }}>
      {children}
    </MindMapContext.Provider>
  );
};