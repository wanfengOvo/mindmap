import React, { useState, useRef, useEffect, useCallback, type JSX } from 'react';
import { useMindMap } from '../context/MindMapContext';
import { MindMapNode as NodeData } from '../types';
import Node from './Node';
import Edge from './Edge';
import styles from './MindMap.module.css';
import Toolbar from './Toolbar'; // 1. 在这里导入 Toolbar
import * as htmlToImage from 'html-to-image'; // 2. 导入 html-to-image 库


const getAllNodes = (node: NodeData): NodeData[] => {
  let nodes = [node];
  if (node.children && !node.isCollapsed) {
    node.children.forEach(child => {
      nodes = nodes.concat(getAllNodes(child));
    });
  }
  return nodes;
};

// --- 辅助函数 (保持不变) ---
const renderNodes = (node: NodeData): JSX.Element[] => {
  const elements = [<Node key={node.id} node={node} />];
  // 假设的折叠功能
  if (!node.isCollapsed) {
    node.children.forEach(child => {
      elements.push(...renderNodes(child));
    });
  }
  return elements;
};

const renderEdges = (node: NodeData): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  if (!node.isCollapsed) {
    node.children.forEach(child => {
      elements.push(<Edge key={`${node.id}-${child.id}`} fromNode={node} toNode={child} />);
      elements.push(...renderEdges(child));
    });
  }
  return elements;
};

// --- 主组件 ---
const MindMap: React.FC = () => {
 const { state, dispatch } = useMindMap();
  const { history, currentIndex, viewState } = state;
  const currentMindMap = history[currentIndex];


 
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null); // Ref 指向我们要截图的区域

  // handleMouseDown 现在可以正确判断点击目标
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - viewState.x,
        y: e.clientY - viewState.y,
      };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    const newX = e.clientX - panStartRef.current.x;
    const newY = e.clientY - panStartRef.current.y;
    // 3. 使用 dispatch 更新全局 viewState
    dispatch({ type: 'SET_VIEW_STATE', payload: { ...viewState, x: newX, y: newY }});
  }, [isPanning, viewState, dispatch]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { clientX, clientY, deltaY } = e;
    const zoomFactor = 1.1;
    const newScale = deltaY < 0 ? viewState.scale * zoomFactor : viewState.scale / zoomFactor;
    const clampedScale = Math.max(0.2, Math.min(newScale, 3));
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const newX = mouseX - (mouseX - viewState.x) * (clampedScale / viewState.scale);
    const newY = mouseY - (mouseY - viewState.y) * (clampedScale / viewState.scale);

    // 4. 使用 dispatch 更新全局 viewState
    dispatch({ type: 'SET_VIEW_STATE', payload: { x: newX, y: newY, scale: clampedScale }});
  };
  
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, handleMouseMove, handleMouseUp]);

  const handleExport = useCallback(async () => {
    const sceneElement = sceneRef.current;
    if (!sceneElement) {
      return;
    }
    setIsExporting(true);

    try {
      // a. 计算所有节点的边界
      const allNodes = getAllNodes(currentMindMap);
      if (allNodes.length === 0) return;

      const nodePositions = allNodes.map(n => n.position);
      const minX = Math.min(...nodePositions.map(p => p.x));
      const minY = Math.min(...nodePositions.map(p => p.y));
      const maxX = Math.max(...nodePositions.map(p => p.x));
      const maxY = Math.max(...nodePositions.map(p => p.y));
      
      const PADDING = 100; // 在边界外留出一些空白
      const nodeWidthApproximation = 150; // 节点大致宽度
      const nodeHeightApproximation = 50; // 节点大致高度

      const contentWidth = maxX - minX + nodeWidthApproximation;
      const contentHeight = maxY - minY + nodeHeightApproximation;

      // b. 调用 html-to-image
      const dataUrl = await htmlToImage.toPng(sceneElement, {
        width: contentWidth + PADDING,
        height: contentHeight + PADDING,
        style: {
          // 暂时移动场景，让所有节点都进入截图区域
          transform: `translate(${-minX + PADDING / 2}px, ${-minY + PADDING / 2}px) scale(1)`,
          // 确保背景也被渲染
          backgroundColor: '#f9f9f9',
        },
      });

      // c. 创建链接并触发下载
      const link = document.createElement('a');
      link.download = 'mind-map.png';
      link.href = dataUrl;
      link.click();

    } catch (error) {
      console.error('导出失败!', error);
    } finally {
      setIsExporting(false);
    }
  }, [currentMindMap]);

  if (!currentMindMap) return <div>加载中...</div>;

  return (
    <>
    <Toolbar onExport={handleExport} isExporting={isExporting} />
    <div
      ref={canvasRef}
      className={styles.mindMapCanvas}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      <div
      ref={sceneRef}
        className={styles.mindMapScene}
        style={{
          transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
        }}
      >
        <svg className={styles.svgLayer}>
          <g>{renderEdges(currentMindMap)}</g>
        </svg>
        <div
          className={styles.nodeLayer}
          
        >
          {renderNodes(currentMindMap)}
        </div>
      </div>
    </div>
    </>
  );
};

export default MindMap;