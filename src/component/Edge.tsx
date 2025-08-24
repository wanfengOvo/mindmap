import React from 'react';
import { type MindMapNode } from '../types';

interface EdgeProps {
  fromNode: MindMapNode;
  toNode: MindMapNode;
}

const DEFAULT_NODE_WIDTH = 150;
const APPROX_NODE_HEIGHT = 50; 
const Edge: React.FC<EdgeProps> = ({ fromNode, toNode }) => {
  const fromWidth = fromNode.size?.width ?? DEFAULT_NODE_WIDTH;
  const fromHeight = fromNode.size?.height ?? APPROX_NODE_HEIGHT;
  const toWidth = toNode.size?.width ?? DEFAULT_NODE_WIDTH;
  const toHeight = toNode.size?.height ?? APPROX_NODE_HEIGHT;
  // 节点尺寸的近似值，用于计算连接点
  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 40;
  
  const fromX = fromNode.position.x + fromWidth / 2;
  const fromY = fromNode.position.y + fromHeight / 2;
  const toX = toNode.position.x + toWidth / 2;
  const toY = toNode.position.y + toHeight / 2;

  // 1. 读取子节点的连线样式，提供默认值
  const edgeType = toNode.edgeStyle?.type || 'curved'; // 默认为曲线
  const isDashed = toNode.edgeStyle?.dashed || false;   // 默认为实线

  let pathData = '';

  // 2. 根据类型计算路径
  if (edgeType === 'straight') {
    // 直线路径
    pathData = `M ${fromX},${fromY} L ${toX},${toY}`;
  } else {
    // 曲线路径 (贝塞尔曲线)
    const controlPointX1 = fromX + (toX - fromX) * 0.5;
    const controlPointY1 = fromY;
    const controlPointX2 = fromX + (toX - fromX) * 0.5;
    const controlPointY2 = toY;
    pathData = `M ${fromX},${fromY} C ${controlPointX1},${controlPointY1} ${controlPointX2},${controlPointY2} ${toX},${toY}`;
  }

  // 3. 准备 SVG 路径的属性
  const pathProps = {
    d: pathData,
    stroke: "#a0a0a0",
    strokeWidth: "2",
    fill: "none",
    // 如果是虚线，则添加 strokeDasharray 属性
    strokeDasharray: isDashed ? "5, 5" : undefined,
  };

  return <path {...pathProps} />;
};

export default Edge;