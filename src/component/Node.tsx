import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MindMapNode as NodeData } from '../types';
import { useMindMap } from '../context/MindMapContext';
import styles from './Node.module.css';
import { v4 as uuidv4 } from 'uuid';
import { updateNodeInTree } from '../context/MindMapContext';
import type { SnapLines } from './MindMap';
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, DEFAULT_FONT_SIZE } from './MindMap';

const SNAP_THRESHOLD = 6;

const DRAG_THRESHOLD = 5; 


interface NodeProps {
  node: NodeData;
  isHighlighted?: boolean;
  otherNodes: NodeData[];
  setSnapLines: React.Dispatch<React.SetStateAction<SnapLines>>;
}

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




const Node: React.FC<NodeProps> = ({ node, isHighlighted, otherNodes, setSnapLines }) => {
  const { state, dispatch, updateTree } = useMindMap();
  const { history, currentIndex, selectedNodeIds, viewState, dropTargetId } = state;
  const currentMindMap = history[currentIndex];

  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(node.text);

  const dragActionStarted = useRef(false);
  const dragStartMousePosition = useRef({ x: 0, y: 0 });
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

    setIsDragging(true);

    const rect = nodeRef.current.getBoundingClientRect();
    offset.current = {
      // 2. 【重要】在计算初始偏移时，也必须考虑缩放
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    dragStartMousePosition.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !nodeRef.current) return;
    if (!dragActionStarted.current) {
        const dx = e.clientX - dragStartMousePosition.current.x;
        const dy = e.clientY - dragStartMousePosition.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 如果移动距离小于阈值，则忽略此次移动，不视为拖拽
        if (distance < DRAG_THRESHOLD) {
            return;
        }
        // 一旦超过阈值，就正式启动拖拽操作
        dispatch({ type: 'START_COALESCING' });
        dragActionStarted.current = true;
    }
    const { scale } = viewState;
    const parentCanvas = nodeRef.current.offsetParent as HTMLElement;
    if (!parentCanvas) return;
    const parentRect = parentCanvas.getBoundingClientRect();

    const unsnappedPosition = {
      x: (e.clientX - offset.current.x - parentRect.left) / scale,
      y: (e.clientY - offset.current.y - parentRect.top) / scale,
    };

    const snappedPosition = { ...unsnappedPosition };
    const activeSnapLines: SnapLines = { horizontal: [], vertical: [] };

    const draggedNodeWidth = node.size?.width ?? DEFAULT_NODE_WIDTH;
    const draggedNodeHeight = node.size?.height ?? DEFAULT_NODE_HEIGHT;


    let bestSnapX = { dist: Infinity, pos: 0, line: 0 };
    let bestSnapY = { dist: Infinity, pos: 0, line: 0 };

    const draggedPointsX = [unsnappedPosition.x, unsnappedPosition.x + draggedNodeWidth / 2, unsnappedPosition.x + draggedNodeWidth];
    const draggedPointsY = [unsnappedPosition.y, unsnappedPosition.y + draggedNodeHeight / 2, unsnappedPosition.y + draggedNodeHeight];

    for (const other of otherNodes) {
      const otherWidth = other.size?.width ?? DEFAULT_NODE_WIDTH;
      const otherHeight = other.size?.height ?? DEFAULT_NODE_HEIGHT;
      const otherPointsX = [other.position.x, other.position.x + otherWidth / 2, other.position.x + otherWidth];
      const otherPointsY = [other.position.y, other.position.y + otherHeight / 2, other.position.y + otherHeight];

      // 寻找最佳的垂直吸附线 (X轴)
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const dist = Math.abs(draggedPointsX[i] - otherPointsX[j]);
          if (dist < bestSnapX.dist) {
            bestSnapX = { dist, pos: otherPointsX[j] - (draggedPointsX[i] - unsnappedPosition.x), line: otherPointsX[j] };
          }
        }
      }
      // 寻找最佳的水平吸附线 (Y轴)
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const dist = Math.abs(draggedPointsY[i] - otherPointsY[j]);
          if (dist < bestSnapY.dist) {
            bestSnapY = { dist, pos: otherPointsY[j] - (draggedPointsY[i] - unsnappedPosition.y), line: otherPointsY[j] };
          }
        }
      }
    }

    // 如果找到了足够近的吸附点，则应用它
    if (bestSnapX.dist < SNAP_THRESHOLD / scale) {
      snappedPosition.x = bestSnapX.pos;
      activeSnapLines.vertical = [bestSnapX.line];
    }
    if (bestSnapY.dist < SNAP_THRESHOLD / scale) {
      snappedPosition.y = bestSnapY.pos;
      activeSnapLines.horizontal = [bestSnapY.line];
    }
    const hasMoved = snappedPosition.x !== node.position.x || snappedPosition.y !== node.position.y;

    if (hasMoved) {
        const newTree = updateNodeInTree(currentMindMap, node.id, n => ({ ...n, position: snappedPosition }));
        updateTree(newTree);
    }
    // --- 更新状态和 UI ---
    setSnapLines(activeSnapLines);
    const newTree = updateNodeInTree(currentMindMap, node.id, n => ({ ...n, position: snappedPosition }));
    updateTree(newTree);

    const allNodes = otherNodes.concat([node]); // Re-use already available nodes
    const validTargets = allNodes.filter(n => n.id !== node.id && !isDescendant(n.id, node));
    let targetFound = false;
    for (const targetNode of validTargets) {
      const targetElement = document.getElementById(`node-${targetNode.id}`);
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

  }, [isDragging, currentMindMap, node, otherNodes, setSnapLines, viewState, updateTree, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      if (dragActionStarted.current) {
        dispatch({ type: 'END_COALESCING' });
      }
      if (dropTargetId) {
        const { newTree: treeWithoutNode, detachedNode } = detachNodeFromTree(currentMindMap, node.id);
        if (detachedNode) {
          const finalTree = updateNodeInTree(treeWithoutNode, dropTargetId, parentNode => ({
            ...parentNode,
            children: [...parentNode.children, { ...detachedNode, parentId: parentNode.id }]
          }));
          updateTree(finalTree);
        }
      }
      dispatch({ type: 'SET_DROP_TARGET', payload: null });
      setSnapLines({}); // 清空吸附线
      setIsDragging(false);
      dragActionStarted.current = false
    }
  }, [isDragging, dispatch, dropTargetId, currentMindMap, node.id, updateTree, setSnapLines]);


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
      dispatch({ type: 'SET_SELECTED_NODES', payload: [] });
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