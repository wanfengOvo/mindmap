import React from 'react';
import type { MindMapNode } from '../types';
import styles from './Edge.module.css';

const DEFAULT_NODE_WIDTH = 150;
const APPROX_NODE_HEIGHT = 50; 

interface EdgeProps {
  fromNode: MindMapNode;
  toNode: MindMapNode;
  isHighlighted?: boolean;
}

const Edge: React.FC<EdgeProps> = ({ fromNode, toNode, isHighlighted }) => {
  // --- 中心点和路径计算逻辑保持不变 ---
  const fromWidth = fromNode.size?.width ?? DEFAULT_NODE_WIDTH;
  const fromHeight = fromNode.size?.height ?? APPROX_NODE_HEIGHT;
  const toWidth = toNode.size?.width ?? DEFAULT_NODE_WIDTH;
  const toHeight = toNode.size?.height ?? APPROX_NODE_HEIGHT;

  const fromX = fromNode.position.x + fromWidth / 2;
  const fromY = fromNode.position.y + fromHeight / 2;
  const toX = toNode.position.x + toWidth / 2;
  const toY = toNode.position.y + toHeight / 2;

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

  return <path className={pathClassName} d={pathData} />;
};

export default Edge;