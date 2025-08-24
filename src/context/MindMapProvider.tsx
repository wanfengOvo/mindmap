import React, { useReducer, useEffect } from 'react';
import type { MindMapNode } from '../types';
import {
  MindMapContext,
  mindMapReducer,
  initialState,
  initializer,
  LOCAL_STORAGE_KEY
} from './MindMapContext';

export const MindMapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(mindMapReducer, initialState, initializer);
  
  useEffect(() => {
    const { isCoalescing, ...stateToSave } = state;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [state]);

  const updateTree = (newTree: MindMapNode) => {
      dispatch({ type: 'OPERATION', payload: newTree });
  };

  return (
    <MindMapContext.Provider value={{ state, dispatch, updateTree }}>
      {children}
    </MindMapContext.Provider>
  );
};