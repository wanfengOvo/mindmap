import { createContext, useContext, type Dispatch } from 'react';
import type { MindMapNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

// 初始数据
export const initialData: MindMapNode = {
  id: 'root',
  text: '中心主题',
  position: { x: 400, y: 300 },
  children: [
    {
      id: uuidv4(),
      parentId: 'root',
      text: '分支1',
      position: { x: 200, y: 200 },
      children: [],
    },
    {
      id: uuidv4(),
      parentId: 'root',
      text: '分支2',
      position: { x: 600, y: 400 },
      children: [],
    },
  ],
};

// Action 类型定义
export type Action =
  | { type: 'UPDATE_NODE_POSITION'; payload: { id: string; position: { x: number; y: number } } }
  | { type: 'ADD_CHILD_NODE'; payload: { parentId: string } }
  | { type: 'REMOVE_NODE'; payload: { id: string } }
  | { type: 'UPDATE_NODE_TEXT'; payload: { id: string; text: string } };

// 递归函数
export const updateNodeRecursively = (nodes: MindMapNode[], action: Action): MindMapNode[] => {
  return nodes.map(node => {
    if (node.id === (action.payload as any).id || node.id === (action.payload as any).parentId) {
      switch (action.type) {
        case 'UPDATE_NODE_POSITION':
          if (node.id === action.payload.id) {
            return { ...node, position: action.payload.position };
          }
          break;
        case 'ADD_CHILD_NODE':
          if (node.id === action.payload.parentId) {
            const newNode: MindMapNode = {
              id: uuidv4(),
              parentId: node.id,
              text: '新分支',
              position: { x: node.position.x + 150, y: node.position.y + 50 },
              children: [],
            };
            return { ...node, children: [...node.children, newNode] };
          }
          break;
        case 'UPDATE_NODE_TEXT':
          if (node.id === action.payload.id) {
            return { ...node, text: action.payload.text };
          }
          break;
      }
    }
    return { ...node, children: updateNodeRecursively(node.children, action) };
  });
};

export const removeNodeRecursively = (nodes: MindMapNode[], id: string): MindMapNode[] => {
  return nodes.filter(node => node.id !== id).map(node => ({
    ...node,
    children: removeNodeRecursively(node.children, id),
  }));
};

// Reducer 函数
export const mindMapReducer = (state: MindMapNode, action: Action): MindMapNode => {
  switch (action.type) {
    case 'UPDATE_NODE_POSITION':
    case 'ADD_CHILD_NODE':
    case 'UPDATE_NODE_TEXT':
      if (state.id === (action.payload as any).id || state.id === (action.payload as any).parentId) {
        if (action.type === 'ADD_CHILD_NODE' && state.id === action.payload.parentId) {
          const newNode: MindMapNode = {
            id: uuidv4(),
            parentId: state.id,
            text: '新分支',
            position: { x: state.position.x + 150, y: state.position.y + 50 },
            children: [],
          };
          return { ...state, children: [...state.children, newNode] };
        }
        if (action.type === 'UPDATE_NODE_POSITION' && state.id === action.payload.id) {
          return { ...state, position: action.payload.position };
        }
        if (action.type === 'UPDATE_NODE_TEXT' && state.id === action.payload.id) {
          return { ...state, text: action.payload.text };
        }
      }
      return { ...state, children: updateNodeRecursively(state.children, action) };

    case 'REMOVE_NODE':
      return { ...state, children: removeNodeRecursively(state.children, action.payload.id) };

    default:
      return state;
  }
};

// 创建 Context
export const MindMapContext = createContext<{
  state: MindMapNode;
  dispatch: Dispatch<Action>;
}>({
  state: initialData,
  dispatch: () => null,
});


export const useMindMap = () => useContext(MindMapContext);