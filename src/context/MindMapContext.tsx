import { createContext, type Dispatch, useContext } from 'react';
import { type MindMapNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- 辅助函数 ---

// 递归地为节点及其所有子节点生成新的ID
const deepCopyNodeWithNewIds = (node: MindMapNode): MindMapNode => {
  const newId = uuidv4(); // 1. 先生成新的 ID
  const newNode: MindMapNode = {
    ...node,
    id: newId, // 2. 使用新 ID
    children: node.children.map(child => {
        const newChild = deepCopyNodeWithNewIds(child);
        newChild.parentId = newId; // 3. 将新 ID 应用于子节点
        return newChild;
    })
  };
  return newNode;
};

// 在树中查找并更新节点
export const updateNodeInTree = (
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
export const findNodeInTree = (node: MindMapNode, id: string): MindMapNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findNodeInTree(child, id);
        if (found) return found;
    }
    return null;
}



interface ViewState {
  x: number;
  y: number;
  scale: number;
}


// 定义应用的总状态
interface AppState {
  history: MindMapNode[];
  currentIndex: number;
  selectedNodeIds: string[];
  clipboard: MindMapNode | null;
  isCoalescing: boolean; // 是否正在合并操作 (例如拖拽)
  viewState: ViewState; // 视图状态
  activeNotesNodeId: string | null;
  dropTargetId: string | null
  isPreviewMode: boolean
}

// 定义 Action 类型
type Action =
  | { type: 'OPERATION'; payload: MindMapNode }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_SELECTED_NODES'; payload: string[] }//选中的节点
  | { type: 'DELETE_SELECTED_NODES' } 
  | { type: 'COPY_NODE' }
  | { type: 'PASTE_NODE' }
  | { type: 'START_COALESCING' }
  | { type: 'END_COALESCING' }
  | { type: 'SET_VIEW_STATE'; payload: ViewState } 
  | { type: 'SET_ACTIVE_NOTES_NODE'; payload: string | null }
  | { type: 'SET_DROP_TARGET'; payload: string | null }
  | { type: 'CUT_NODES' }
  | { type: 'TOGGLE_PREVIEW_MODE' }

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
  selectedNodeIds: [],
  clipboard: null,
  isCoalescing: false,
  viewState: { x: 0, y: 0, scale: 1 }, // 新增
  activeNotesNodeId: null,
  dropTargetId: null,
  isPreviewMode: false
};


export const initializer = (initialValue: AppState): AppState => {
  try {
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
      const savedState = JSON.parse(savedStateJSON);
      const mergedState = { ...initialValue, ...savedState };
      return {
        ...mergedState,
        selectedNodeIds: [],
        activeNotesNodeId: null,
        isCoalescing: false,
        dropTargetId: null,
      };
    }
  } catch (error) { console.error("解析本地存储数据失败:", error); }
  return initialValue;
};

// Reducer 函数
export const mindMapReducer = (state: AppState, action: Action): AppState => {
  const { history, currentIndex, selectedNodeIds, clipboard, isCoalescing } = state;
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
        return { ...state, currentIndex: currentIndex - 1, selectedNodeIds: [] };
      }
      return state;
    }

    case 'REDO': {
      if (currentIndex < history.length - 1) {
        return { ...state, currentIndex: currentIndex + 1, selectedNodeIds: [] };
      }
      return state;
    }

    case 'SET_SELECTED_NODES': {
        return { ...state, selectedNodeIds: action.payload };
    }

    case 'DELETE_SELECTED_NODES': {
        if (selectedNodeIds.length === 0) return state;
        const idsToDelete = selectedNodeIds.filter(id => id !== 'root');
        if (idsToDelete.length === 0) return state;
        const removeNodesFromTree = (rootNode: MindMapNode, idsToRemove: string[]): MindMapNode => ({
            ...rootNode,
            children: rootNode.children
                .filter(child => !idsToRemove.includes(child.id))
                .map(child => removeNodesFromTree(child, idsToRemove))
        });
        const newTree = removeNodesFromTree(currentMindMap, idsToDelete);
        const newHistory = state.history.slice(0, state.currentIndex + 1);
        newHistory.push(newTree);
        return { ...state, history: newHistory, currentIndex: newHistory.length - 1, selectedNodeIds: [] };
    }

    case 'COPY_NODE': {
        if (selectedNodeIds.length === 0) return state;
        const nodeToCopy = findNodeInTree(currentMindMap, selectedNodeIds[0]);
        return nodeToCopy ? { ...state, clipboard: { ...nodeToCopy } } : state;
    }
    case 'PASTE_NODE': {
        if (!clipboard || selectedNodeIds.length === 0) return state;
        const targetParentId = selectedNodeIds[0];
        const copiedNodeWithNewIds = deepCopyNodeWithNewIds(clipboard);
        const newMindMap = updateNodeInTree(currentMindMap, targetParentId, (parentNode) => ({
            ...parentNode,
            children: [...parentNode.children, copiedNodeWithNewIds],
        }));
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(newMindMap);
        return { ...state, history: newHistory, currentIndex: newHistory.length - 1 };
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

     case 'SET_DROP_TARGET':
        // 这是一个临时的UI状态，不计入历史
        return { ...state, dropTargetId: action.payload };
    

     case 'CUT_NODES': {
      // 如果没有选中节点，或只选中了根节点，则不执行任何操作
      if (selectedNodeIds.length === 0) return state;
      const idsToCut = selectedNodeIds.filter(id => id !== 'root');
      if (idsToCut.length === 0) return state;

      // 1. 复制部分：将第一个被选中的节点放入剪贴板
      const firstSelectedId = idsToCut[0];
      const nodeToCut = findNodeInTree(currentMindMap, firstSelectedId);
      if (!nodeToCut) return state; // 安全检查

      // 2. 删除部分：从树中移除所有被选中的节点
      const removeNodesFromTree = (rootNode: MindMapNode, idsToRemove: string[]): MindMapNode => ({
          ...rootNode,
          children: rootNode.children
              .filter(child => !idsToRemove.includes(child.id))
              .map(child => removeNodesFromTree(child, idsToRemove))
      });
      const newTree = removeNodesFromTree(currentMindMap, idsToCut);

      // 3. 将新树状态计入历史，并更新剪贴板
      const newHistory = state.history.slice(0, state.currentIndex + 1);
      newHistory.push(newTree);
      return {
          ...state,
          history: newHistory,
          currentIndex: newHistory.length - 1,
          clipboard: { ...nodeToCut }, // 更新剪贴板
          selectedNodeIds: [], // 清空选择
      };
    }
    
    case 'TOGGLE_PREVIEW_MODE':
      return {
        ...state,
        isPreviewMode: !state.isPreviewMode,
        // 进入预览时，清空选择，确保一个干净的视图
        selectedNodeIds: [],
      };
    
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