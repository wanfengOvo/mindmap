import { createContext, type Dispatch, useContext } from 'react';
import { type MindMapNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- 辅助函数 ---

// 递归地为节点及其所有子节点生成新的ID
const deepCopyNodeWithNewIds = (node: MindMapNode): MindMapNode => {
  const newNode: MindMapNode = {
    ...node,
    id: uuidv4(),
    children: node.children.map(child => {
        const newChild = deepCopyNodeWithNewIds(child);
        newChild.parentId = newNode.id; // 更新子节点的parentId
        return newChild;
    })
  };
  return newNode;
};

// 在树中查找并更新节点
const updateNodeInTree = (
  rootNode: MindMapNode,
  nodeId: string,
  updateFn: (node: MindMapNode) => MindMapNode
): MindMapNode => {
    if (rootNode.id === nodeId) {
        return updateFn(rootNode);
    }
    return {
        ...rootNode,
        children: rootNode.children.map(child => updateNodeInTree(child, nodeId, updateFn))
    };
};

// 在树中查找节点
const findNodeInTree = (node: MindMapNode, id: string): MindMapNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findNodeInTree(child, id);
        if (found) return found;
    }
    return null;
}

// --- State, Action, Reducer 定义 ---

interface ViewState {
  x: number;
  y: number;
  scale: number;
}


// 定义应用的总状态
interface AppState {
  history: MindMapNode[];
  currentIndex: number;
  selectedNodeId: string | null;
  clipboard: MindMapNode | null;
  isCoalescing: boolean; // 是否正在合并操作 (例如拖拽)
  viewState: ViewState; // 新增：视图状态
  activeNotesNodeId: string | null;
}

// 定义 Action 类型
type Action =
  | { type: 'OPERATION'; payload: MindMapNode }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_SELECTED_NODE'; payload: { id: string | null } }
  | { type: 'COPY_NODE' }
  | { type: 'PASTE_NODE' }
  | { type: 'START_COALESCING' }
  | { type: 'END_COALESCING' }
  | { type: 'SET_VIEW_STATE'; payload: ViewState } // 新增 Action
  | { type: 'SET_ACTIVE_NOTES_NODE'; payload: string | null };

export const LOCAL_STORAGE_KEY = 'mindMapAppState';


// 初始数据
const initialNode: MindMapNode = {
  id: 'root',
  text: '中心主题',
  position: { x: 400, y: 300 },
  children: [],
  
};

export const initialState: AppState = {
  history: [initialNode],
  currentIndex: 0,
  selectedNodeId: 'root',
  clipboard: null,
  isCoalescing: false,
  viewState: { x: 0, y: 0, scale: 1 }, // 新增
  activeNotesNodeId: null,
};


export const initializer = (initialValue: AppState): AppState => {
  try {
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
      const savedState = JSON.parse(savedStateJSON);
      // 为了更好的体验，我们在加载时重置一些临时的UI状态
      return {
        ...savedState,
        selectedNodeId: null,
        activeNotesNodeId: null,
        isCoalescing: false,
      };
    }
  } catch (error) {
    console.error("解析本地存储数据失败:", error);
    // 如果解析失败，返回默认的初始状态
    return initialValue;
  }
  return initialValue;
};


// Reducer 函数
export const mindMapReducer = (state: AppState, action: Action): AppState => {
  const { history, currentIndex, selectedNodeId, clipboard, isCoalescing } = state;
  const currentMindMap = history[currentIndex];

  switch (action.type) {
    case 'START_COALESCING': {
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(currentMindMap); // 复制当前状态作为新操作的起点
        return { 
            ...state, 
            isCoalescing: true,
            history: newHistory,
            currentIndex: newHistory.length - 1
        };
    }

    case 'END_COALESCING': {
        return { ...state, isCoalescing: false };
    }

    case 'OPERATION': {
        const newMindMap = action.payload;
        if (isCoalescing) {
            // 如果正在合并，我们总是替换当前的历史记录
            const newHistory = [...history];
            newHistory[currentIndex] = newMindMap;
            return {
                ...state,
                history: newHistory,
            };
        } else {
            // 正常操作，创建新的历史记录
            const newHistory = history.slice(0, currentIndex + 1);
            newHistory.push(newMindMap);
            return {
                ...state,
                history: newHistory,
                currentIndex: newHistory.length - 1,
            };
        }
    }

    case 'UNDO': {
      if (currentIndex > 0) {
        return { ...state, currentIndex: currentIndex - 1, selectedNodeId: null };
      }
      return state;
    }

    case 'REDO': {
      if (currentIndex < history.length - 1) {
        return { ...state, currentIndex: currentIndex + 1, selectedNodeId: null };
      }
      return state;
    }

    case 'SET_SELECTED_NODE': {
        return { ...state, selectedNodeId: action.payload.id };
    }

    case 'COPY_NODE': {
        if (!selectedNodeId) return state;
        const nodeToCopy = findNodeInTree(currentMindMap, selectedNodeId);
        return nodeToCopy ? { ...state, clipboard: { ...nodeToCopy } } : state;
    }
    
    case 'PASTE_NODE': {
        if (!clipboard || !selectedNodeId) return state;
        const copiedNodeWithNewIds = deepCopyNodeWithNewIds(clipboard);
        const newMindMap = updateNodeInTree(currentMindMap, selectedNodeId, (parentNode) => ({
            ...parentNode,
            children: [...parentNode.children, copiedNodeWithNewIds],
        }));
        
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(newMindMap);
        return {
            ...state,
            history: newHistory,
            currentIndex: newHistory.length - 1,
        };
    }

    case 'SET_VIEW_STATE':
        // 更新视图状态不计入历史记录
        return { ...state, viewState: action.payload };

    case 'SET_ACTIVE_NOTES_NODE':
        // 如果点击的是同一个已激活的节点，则关闭备注；否则，打开新节点的备注
      if (state.activeNotesNodeId === action.payload) {
          return { ...state, activeNotesNodeId: null };
      }
    return { ...state, activeNotesNodeId: action.payload };
    
    default:
      return state;
  }
};


export const MindMapContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
  updateTree: (newTree: MindMapNode) => void;
}>({
  state: initialState,
  dispatch: () => null,
  updateTree: () => null,
});



export const useMindMap = () => useContext(MindMapContext);