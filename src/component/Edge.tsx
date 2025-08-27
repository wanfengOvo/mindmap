import React, { useEffect, useState } from 'react';
import { useMindMap } from '../context/MindMapContext';
import type { MindMapNode } from '../types';
import styles from './Edge.module.css';
import { updateNodeInTree } from '../context/MindMapContext';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './MindMap';




interface EdgeProps {
  fromNode: MindMapNode;
  toNode: MindMapNode;
  isHighlighted?: boolean;
}

const Edge: React.FC<EdgeProps> = ({ fromNode, toNode, isHighlighted }) => {
  const { state, updateTree } = useMindMap();
  const currentMindMap = state.history[state.currentIndex];
  const [isEditing, setIsEditing] = useState(false);
  const [labelText, setLabelText] = useState(toNode.edgeLabel || '');
  useEffect(() => {
    setLabelText(toNode.edgeLabel || '');
  }, [toNode.edgeLabel]);
  // --- 中心点和路径计算逻辑保持不变 ---
  const fromWidth = fromNode.size?.width ?? DEFAULT_NODE_WIDTH;
  const fromHeight = fromNode.size?.height ?? DEFAULT_NODE_HEIGHT;
  const toWidth = toNode.size?.width ?? DEFAULT_NODE_WIDTH;
  const toHeight = toNode.size?.height ?? DEFAULT_NODE_HEIGHT;

  const fromX = fromNode.position.x + fromWidth / 2;
  const fromY = fromNode.position.y + fromHeight / 2;
  const toX = toNode.position.x + toWidth / 2;
  const toY = toNode.position.y + toHeight / 2;

  const labelX = (fromX + toX) / 2;
  const labelY = (fromY + toY) / 2;
  const edgeType = toNode.edgeStyle?.type || 'curved';
  const isDashedInNormalState = toNode.edgeStyle?.dashed || false;
  let pathData = '';

  if (edgeType === 'straight') {
    pathData = `M ${fromX},${fromY} L ${toX},${toY}`;
  } else {
    const controlPointX1 = fromX + (toX - fromX) * 0.5;
    const controlPointY1 = fromY;
    const controlPointX2 = fromX + (toX - fromX) * 0.5;
    const controlPointY2 = toY;
    pathData = `M ${fromX},${fromY} C ${controlPointX1},${controlPointY1} ${controlPointX2},${controlPointY2} ${toX},${toY}`;
  }


  // 1. 基础样式总是应用。
  // 2. 如果是高亮状态，应用高亮（动画）样式。
  // 3. 如果不是高亮状态，再检查它是否应该是虚线。
  const pathClassName = [
    styles.edgePath,
    isHighlighted ? styles.highlighted : (isDashedInNormalState ? styles.dashed : '')
  ].join(' ').trim();

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabelText(e.target.value);
  };

  const handleSave = () => {
    const newTree = updateNodeInTree(currentMindMap, toNode.id, node => ({
      ...node,
      edgeLabel: labelText,
    }));
    updateTree(newTree);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setLabelText(toNode.edgeLabel || ''); // 取消编辑，恢复原状
      setIsEditing(false);
    }
  };
  return (
    <g>
      <path
        className={styles.edgeHitbox}
        d={pathData}
        onDoubleClick={handleDoubleClick}
      />
      <path
        className={pathClassName}
        d={pathData}
      />
      {(labelText || isEditing) && (
        <foreignObject x={labelX - 75} y={labelY - 20} width="150" height="40" style={{ pointerEvents: 'none' }}>
          {isEditing ? (
            <input
              type="text"

              className={styles.edgeInput}
              value={labelText}
              onChange={handleLabelChange}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <div

              className={styles.edgeLabel}
              onDoubleClick={handleDoubleClick}
            >
              {labelText}
            </div>
          )}
        </foreignObject>
      )}
    </g>
  );
};

export default Edge;