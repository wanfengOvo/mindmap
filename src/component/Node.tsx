import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MindMapNode as NodeData } from '../types';
import { useMindMap } from '../context/MindMapContext';
import styles from './Node.module.css';
import { v4 as uuidv4 } from 'uuid';
import { updateNodeInTree } from '../context/MindMapContext';
import { getAllNodes } from '../utils/util';
const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_FONT_SIZE = 16;




const removeNodeFromTree = (rootNode: NodeData, nodeId: string): NodeData => {
    return {
        ...rootNode,
        children: rootNode.children.filter(child => child.id !== nodeId).map(child => removeNodeFromTree(child, nodeId))
    };
};



const isDescendant = (childId: string, parentNode: NodeData): boolean => {
    if (parentNode.children.some(child => child.id === childId)) {
        return true;
    }
    for (const child of parentNode.children) {
        if (isDescendant(childId, child)) {
            return true;
        }
    }
    return false;
};


const detachNodeFromTree = (rootNode: NodeData, nodeId: string): { newTree: NodeData, detachedNode: NodeData | null } => {
    let detachedNode: NodeData | null = null;
    const searchAndRemove = (node: NodeData): NodeData => {
        const newChildren = [];
        for (const child of node.children) {
            if (child.id === nodeId) {
                detachedNode = child;
            } else {
                newChildren.push(searchAndRemove(child));
            }
        }
        return { ...node, children: newChildren };
    };
    const newTree = searchAndRemove(rootNode);
    return { newTree, detachedNode };
};




interface NodeProps {
  node: NodeData;
  isHighlighted?: boolean;
}

const Node: React.FC<NodeProps> = ({ node,isHighlighted  }) => {
  const { state, dispatch, updateTree } = useMindMap();
  const { history, currentIndex, selectedNodeIds, viewState,dropTargetId } = state;
  const currentMindMap = history[currentIndex];

  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(node.text);
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setText(node.text);
  }, [node.text]);



  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) { // 按住 Shift 实现多选/取消选
      const newSelection = selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter(id => id !== node.id)
        : [...selectedNodeIds, node.id];
      dispatch({ type: 'SET_SELECTED_NODES', payload: newSelection });
    } else { // 普通单击，只选中当前节点
      dispatch({ type: 'SET_SELECTED_NODES', payload: [node.id] });
    }
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing || (e.target as HTMLElement).tagName === 'INPUT' || !nodeRef.current) return;
    dispatch({ type: 'START_COALESCING' });
    setIsDragging(true);

    const rect = nodeRef.current.getBoundingClientRect();
    offset.current = {
      // 2. 【重要】在计算初始偏移时，也必须考虑缩放
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !nodeRef.current) return;

    const { scale } = viewState;
    const parentCanvas = nodeRef.current.offsetParent as HTMLElement;
    if (!parentCanvas) return;

    const parentRect = parentCanvas.getBoundingClientRect();

    // 1. 计算节点左上角在 Viewport 中的目标位置
    const targetX_viewport = e.clientX - offset.current.x;
    const targetY_viewport = e.clientY - offset.current.y;

    // 2. 将 Viewport 坐标转换为相对于父容器(Scene)的坐标
    const targetX_scene = targetX_viewport - parentRect.left;
    const targetY_scene = targetY_viewport - parentRect.top;

    // 3. 将相对于 Scene 的坐标“反缩放”，得到 style 所需的值
    const newPosition = {
        x: targetX_scene / scale,
        y: targetY_scene / scale
    };

    

    const newTree = updateNodeInTree(currentMindMap, node.id, n => ({ ...n, position: newPosition }));
    updateTree(newTree);

    const allNodes = getAllNodes(currentMindMap);
    const validTargets = allNodes.filter(n => {
        // 不能是自己，也不能是自己的后代
        return n.id !== node.id && !isDescendant(n.id, node);
    });

    let targetFound = false;
    for (const targetNode of validTargets) {
        const targetElement = document.getElementById(`node-${targetNode.id}`); // 我们需要给节点加上ID
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            if (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
                dispatch({ type: 'SET_DROP_TARGET', payload: targetNode.id });
                targetFound = true;
                break;
            }
        }
    }

    if (!targetFound) {
        dispatch({ type: 'SET_DROP_TARGET', payload: null });
    }

}, [isDragging, currentMindMap, node, viewState, updateTree, dispatch]);

 const handleMouseUp = useCallback(() => {
    if (isDragging) {
      dispatch({ type: 'END_COALESCING' });
      if (dropTargetId) {
          const { newTree: treeWithoutNode, detachedNode } = detachNodeFromTree(currentMindMap, node.id);
          if (detachedNode) {
              const finalTree = updateNodeInTree(treeWithoutNode, dropTargetId, parentNode => ({
                  ...parentNode,
                  children: [...parentNode.children, { ...detachedNode, parentId: parentNode.id }]
              }));
              // 作为一个独立的操作计入历史
              updateTree(finalTree); 
          }
      }
      
      // 清理状态
      dispatch({ type: 'SET_DROP_TARGET', payload: null });
      setIsDragging(false);
    }
  }, [isDragging, dispatch, dropTargetId, currentMindMap, node.id, updateTree]);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，防止触发节点的选中事件
    const newTree = updateNodeInTree(currentMindMap, node.id, n => ({
      ...n,
      isCollapsed: !n.isCollapsed, // 切换折叠状态
    }));
    updateTree(newTree);
  };

  // --- 修改树结构的操作 ---

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleBlur = () => {
    // 文本编辑是单个操作，不使用合并模式
    const newTree = updateNodeInTree(currentMindMap, node.id, n => ({ ...n, text }));
    updateTree(newTree);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  const addChildNode = () => {
    const newNode: NodeData = {
      id: uuidv4(),
      parentId: node.id,
      text: '新分支',
      position: { x: node.position.x + 150, y: node.position.y + 50 },
      children: [],
    };
    const newTree = updateNodeInTree(currentMindMap, node.id, n => ({ ...n, children: [...n.children, newNode] }));
    updateTree(newTree);
  };

  const removeNode = () => {
    if (node.id !== 'root') {
      const newTree = removeNodeFromTree(currentMindMap, node.id);
      dispatch({ type: 'SET_SELECTED_NODE', payload: { id: null } });
      updateTree(newTree);
    }
  };

  const handleNotesIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 找到备注输入框并聚焦
   dispatch({ type: 'SET_ACTIVE_NOTES_NODE', payload: node.id });
  };
  // --- 渲染 ---

  const isSelected = selectedNodeIds.includes(node.id);
  const isDropTarget = dropTargetId === node.id;
    const nodeClassName = `
    ${styles.node} 
    ${isSelected ? styles.selected : ''} 
    ${isDropTarget ? styles.dropTarget : ''}
    ${isHighlighted && !isSelected ? styles.pathHighlight : ''}
  `;


  return (
    <div
    id={`node-${node.id}`}
      ref={nodeRef}
      className={nodeClassName.trim()}
      style={{
        top: node.position.y,
        left: node.position.x,
        cursor: isDragging ? 'grabbing' : 'grab',
        // 应用自定义样式
        backgroundColor: node.style?.backgroundColor,
        color: node.style?.color,
        fontSize: `${node.style?.fontSize ?? DEFAULT_FONT_SIZE}px`,
        // 应用自定义尺寸
        width: `${node.size?.width ?? DEFAULT_NODE_WIDTH}px`,
        // 高度可以设为 auto 让其自适应内容，或也从 data 中读取
        minHeight: node.size?.height ? `${node.size.height}px` : 'auto',
      }}
      onClick={handleNodeClick}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
        <div className={styles.contentWrapper}>
            {node.icon && <span className={styles.icon}>{node.icon}</span>}
            {isEditing ? (
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className={styles.input}
        />
      ) : (
        <div className={styles.text}>{node.text}</div>
      )}
        </div>
      
      <div className={styles.controls}>
        <button onClick={addChildNode}>+</button>
        {node.id !== 'root' && <button onClick={removeNode}>-</button>}
      </div>
      {node.children.length > 0 && (
        <button
          className={styles.collapseButton}
          onClick={handleToggleCollapse}
        >
          {node.isCollapsed ? '>' : '<'}
        </button>
      )}

       {node.notes && (
          <div className={styles.notesIndicator} onClick={handleNotesIconClick}>
              📝
          </div>
      )}
    </div>
  );
};

export default Node;