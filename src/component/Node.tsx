import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MindMapNode as NodeData } from '../types';
import { useMindMap } from '../context/MindMapContext';
import styles from './Node.module.css';

interface NodeProps {
  node: NodeData;
}

const Node: React.FC<NodeProps> = ({ node }) => {
  const { dispatch } = useMindMap();
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(node.text);
  const nodeRef = useRef<HTMLDivElement>(null);

  // 这个 offset 存储的是鼠标点击点相对于节点左上角的偏移量
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing || (e.target as HTMLElement).tagName === 'INPUT') return;


    if (!nodeRef.current) return;

    setIsDragging(true);

    // 计算鼠标点击位置与节点左上角的偏移

    const rect = nodeRef.current.getBoundingClientRect();
    offset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // isDragging 状态必须为 true, 且 ref 必须存在
    if (!isDragging || !nodeRef.current) return;

    // 1. 找到父级画布元素
    //    offsetParent 会返回最近的、具有CSS定位（static除外）的祖先元素
    const parentCanvas = nodeRef.current.offsetParent as HTMLElement;
    if (!parentCanvas) {
        console.error("无法找到定位父容器！");
        return;
    }

    // 2. 获取父级画布相对于 viewport 的位置
    const parentRect = parentCanvas.getBoundingClientRect();

    // 3. 计算节点的新位置（相对于父级画布）
    //    (e.clientX - offset.current.x) -> 节点左上角应该在的 viewport X 坐标
    //    - parentRect.left -> 将 viewport 坐标转换成相对于父容器的坐标
    const newPosition = {
      x: e.clientX - offset.current.x - parentRect.left,
      y: e.clientY - offset.current.y - parentRect.top,
    };

    dispatch({ type: 'UPDATE_NODE_POSITION', payload: { id: node.id, position: newPosition } });

  }, [isDragging, dispatch, node.id]); // 依赖项保持不变

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      // 监听全局的 mousemove 和 mouseup
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    // 清理函数
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // ... 其他函数 (handleDoubleClick, handleBlur等) 保持不变 ...

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleBlur = () => {
    dispatch({ type: 'UPDATE_NODE_TEXT', payload: { id: node.id, text } });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter') {
         handleBlur();
     }
  }

  const addChildNode = () => {
     dispatch({ type: 'ADD_CHILD_NODE', payload: { parentId: node.id } });
  };

  const removeNode = () => {
     if (node.id !== 'root') {
         dispatch({ type: 'REMOVE_NODE', payload: { id: node.id } });
     }
  };


  return (
    <div
      ref={nodeRef}
      className={styles.node}
      style={{ top: node.position.y, left: node.position.x, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className={styles.input}
        />
      ) : (
        <div className={styles.text}>{node.text}</div>
      )}
      <div className={styles.controls}>
         <button onClick={addChildNode}>+</button>
         {node.id !== 'root' && <button onClick={removeNode}>-</button>}
      </div>
    </div>
  );
};

export default Node;