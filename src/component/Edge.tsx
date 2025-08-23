import React from 'react';
import type  { MindMapNode } from '../types';

interface EdgeProps {
  fromNode: MindMapNode;
  toNode: MindMapNode;
}

const Edge: React.FC<EdgeProps> = ({ fromNode, toNode }) => {
  // 假定每个节点的大小约为 120x40
  const fromX = fromNode.position.x + 60;
  const fromY = fromNode.position.y + 20;
  const toX = toNode.position.x + 60;
  const toY = toNode.position.y + 20;

  // 使用贝塞尔曲线
  const pathData = `M ${fromX},${fromY} C ${fromX + 50},${fromY} ${toX - 50},${toY} ${toX},${toY}`;

  return (
    <path d={pathData} stroke="#a0a0a0" strokeWidth="2" fill="none" />
  );
};

export default Edge;