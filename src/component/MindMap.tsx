import React, { type JSX } from 'react';
import { useMindMap } from '../context/MindMapContext';
import type { MindMapNode as NodeData } from '../types';
import Node from './Node';
import Edge from './Edge';
import styles from './MindMap.module.css';

// 递归函数来渲染节点
const renderNodes = (node: NodeData): JSX.Element[] => {
  const elements = [<Node key={node.id} node={node} />];
  node.children.forEach(child => {
    elements.push(...renderNodes(child));
  });
  return elements;
};

// 递归函数来渲染连线
const renderEdges = (node: NodeData): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  node.children.forEach(child => {
    elements.push(<Edge key={`${node.id}-${child.id}`} fromNode={node} toNode={child} />);
    elements.push(...renderEdges(child));
  });
  return elements;
};

const MindMap: React.FC = () => {
  const { state } = useMindMap();

  if (!state) return <div>加载中...</div>;

  return (
    <div className={styles.mindMapCanvas}>
      <svg className={styles.svgCanvas}>
        <g>{renderEdges(state)}</g>
      </svg>
      {renderNodes(state)}
    </div>
  );
};

export default MindMap;