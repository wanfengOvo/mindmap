import React, { useState, useRef, useEffect, useCallback, type JSX, useMemo } from 'react';
import { useMindMap } from '../context/MindMapContext';
import type { MindMapNode as NodeData } from '../types';
import Node from './Node';
import Edge from './Edge';
import styles from './MindMap.module.css';
import Toolbar from './ToolBar';
import Preview from './Preview';
import OutlineView from './OutlineView';
import { getAllNodes } from '../utils/util';
export const DEFAULT_NODE_WIDTH = 150;
export const DEFAULT_NODE_HEIGHT = 50;
export const DEFAULT_FONT_SIZE = 16;
export interface SnapLines {
  horizontal?: number[];
  vertical?: number[];
}

const findPathToNode = (root: NodeData, nodeId: string): string[] => {
  const findPath = (currentNode: NodeData, path: string[]): string[] | null => {
    const currentPath = [...path, currentNode.id];
    if (currentNode.id === nodeId) {
      return currentPath;
    }
    if (currentNode.children) {
      for (const child of currentNode.children) {
        const result = findPath(child, currentPath);
        if (result) {
          return result;
        }
      }
    }
    return null;
  };
  return findPath(root, []) || [];
};



// --- 主组件 ---
const MindMap: React.FC = () => {
  const { state, dispatch } = useMindMap();
  const { history, currentIndex, viewState, selectedNodeIds, isPreviewMode,viewMode } = state;
  const currentMindMap = history[currentIndex];
  const activePathIds = useMemo(() => {
    if (selectedNodeIds.length !== 1) return [];
    return findPathToNode(currentMindMap, selectedNodeIds[0]);
  }, [currentMindMap, selectedNodeIds]);


  const [isPanning, setIsPanning] = useState(false);
  const [isMarquee, setIsMarquee] = useState(false);
  const [snapLines, setSnapLines] = useState<SnapLines>({});

  const [marqueeRect, setMarqueeRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const marqueeStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const spacebarPressed = useRef(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      // 规则1：当焦点在输入框时，空格键应正常输入，不触发平移
      if (isTyping && e.key === ' ') {
        return;
      }

      // 规则2：只要不在输入，空格键就应该阻止默认行为并准备平移
      if (e.key === ' ') {
        e.preventDefault(); // 无论如何都阻止滚动
        if (!spacebarPressed.current) {
          spacebarPressed.current = true;
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        }
      }

      // 规则3：快捷键（如删除、撤销）不应在输入时触发（删除键除外，但为简化我们统一处理）
      if (isTyping) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        dispatch({ type: 'DELETE_SELECTED_NODES' });
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spacebarPressed.current = false;
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dispatch]);

  const allNodes = useMemo(() => getAllNodes(currentMindMap), [currentMindMap]);
  const renderNodes = (node: NodeData): JSX.Element[] => {
    const otherNodes = allNodes.filter(n => n.id !== node.id);

    const elements = [
      <Node
        key={node.id}
        node={node}
        isHighlighted={activePathIds.includes(node.id)}
        otherNodes={otherNodes}
        setSnapLines={setSnapLines}
      />
    ];
    if (Array.isArray(node.children) && !node.isCollapsed) {
      node.children.forEach(child => elements.push(...renderNodes(child)));
    }
    return elements;
  };

  const renderEdges = (node: NodeData): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    if (!node.isCollapsed) {
      node.children.forEach(child => {
        // 如果父子节点都在路径上，则高亮这条边
        const isEdgeHighlighted = activePathIds.includes(node.id) && activePathIds.includes(child.id);
        elements.push(
          <Edge
            key={`${node.id}-${child.id}`}
            fromNode={node}
            toNode={child}
            isHighlighted={isEdgeHighlighted} // 传递高亮状态
          />
        );
        elements.push(...renderEdges(child));
      });
    }
    return elements;
  };


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains(styles.mindMapCanvas) || target.classList.contains(styles.nodeLayer)) {
      if (spacebarPressed.current || e.button === 1) { // 平移
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - viewState.x, y: e.clientY - viewState.y };
      } else { // 框选
        setIsMarquee(true);
        const canvasRect = canvasRef.current!.getBoundingClientRect();
        const startX = e.clientX - canvasRect.left;
        const startY = e.clientY - canvasRect.top;
        marqueeStartRef.current = { x: startX, y: startY };
        setMarqueeRect({ x: startX, y: startY, width: 0, height: 0 });
        if (!e.shiftKey) dispatch({ type: 'SET_SELECTED_NODES', payload: [] });
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - panStartRef.current.x;
      const newY = e.clientY - panStartRef.current.y;
      dispatch({ type: 'SET_VIEW_STATE', payload: { ...viewState, x: newX, y: newY } });
    } else if (isMarquee) {
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;
      const startX = marqueeStartRef.current.x;
      const startY = marqueeStartRef.current.y;
      const width = mouseX - startX;
      const height = mouseY - startY;
      setMarqueeRect({ x: width > 0 ? startX : mouseX, y: height > 0 ? startY : mouseY, width: Math.abs(width), height: Math.abs(height) });
    }
  }, [isPanning, isMarquee, viewState, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) setIsPanning(false);
    if (isMarquee) {
      setIsMarquee(false);
      const allNodes = getAllNodes(currentMindMap);
      const selectedIdsInRect: string[] = [];
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      allNodes.forEach(node => {
        const nodeWidth = (node.size?.width ?? DEFAULT_NODE_WIDTH) * viewState.scale;
        const nodeHeight = (node.size?.height ?? DEFAULT_NODE_HEIGHT) * viewState.scale;
        const nodeX_viewport = node.position.x * viewState.scale + viewState.x + canvasRect.left;
        const nodeY_viewport = node.position.y * viewState.scale + viewState.y + canvasRect.top;
        if (nodeX_viewport < marqueeRect.x + marqueeRect.width + canvasRect.left && nodeX_viewport + nodeWidth > marqueeRect.x + canvasRect.left &&
          nodeY_viewport < marqueeRect.y + marqueeRect.height + canvasRect.top && nodeY_viewport + nodeHeight > marqueeRect.y + canvasRect.top) {
          selectedIdsInRect.push(node.id);
        }
      });
      const currentEvent = window.event as MouseEvent;
      if (currentEvent?.shiftKey) {
        dispatch({ type: 'SET_SELECTED_NODES', payload: [...new Set([...selectedNodeIds, ...selectedIdsInRect])] });
      } else {
        dispatch({ type: 'SET_SELECTED_NODES', payload: selectedIdsInRect });
      }
    }
  }, [isPanning, isMarquee, currentMindMap, viewState, selectedNodeIds, marqueeRect, dispatch]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const { clientX, clientY, deltaY } = e;
    const zoomFactor = 1.1;
    const newScale = deltaY < 0 ? viewState.scale * zoomFactor : viewState.scale / zoomFactor;
    const clampedScale = Math.max(0.2, Math.min(newScale, 3));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const newX = mouseX - (mouseX - viewState.x) * (clampedScale / viewState.scale);
    const newY = mouseY - (mouseY - viewState.y) * (clampedScale / viewState.scale);

    dispatch({ type: 'SET_VIEW_STATE', payload: { x: newX, y: newY, scale: clampedScale } });
  }, [viewState, dispatch]);


  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      // 添加监听器，并明确设置 passive: false
      canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    }

    // 清理函数：当组件卸载时，移除监听器
    return () => {
      if (canvasElement) {
        canvasElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel]);

  useEffect(() => {
    if (isPanning || isMarquee) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, isMarquee, handleMouseMove, handleMouseUp]);



  if (!currentMindMap) return <div>加载中...</div>;
  const getCursor = () => {
    // 如果正在平移，显示“抓紧”的手形
    if (isPanning) {
      return 'grabbing';
    }
    // 如果按下了空格键（准备平移），显示“可抓取”的手形
    if (spacebarPressed.current) {
      return 'grab';
    }
    // 默认情况下，是普通光标（适用于框选）
    return 'default';
  };

  if (viewMode === 'outline') {
        return <OutlineView />;
    }
  return (
    <>
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 101 }}>
                <button
                    onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'outline' })}
                    style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc' }}
                >
                    切换到大纲
                </button>
            </div>
      <Toolbar />
      <div ref={canvasRef} className={styles.mindMapCanvas} onMouseDown={handleMouseDown} style={{ cursor: getCursor() }} tabIndex={-1}>
        <div ref={sceneRef} className={styles.mindMapScene} style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})` }}>
          <svg className={styles.svgLayer}><g>{renderEdges(currentMindMap)}</g></svg>
          <div className={styles.nodeLayer}>{renderNodes(currentMindMap)}</div>
          {snapLines.vertical?.map(x => (
            <div key={`v-${x}`} className={styles.snapLineVertical} style={{ left: x }} />
          ))}
          {snapLines.horizontal?.map(y => (
            <div key={`h-${y}`} className={styles.snapLineHorizontal} style={{ top: y }} />
          ))}
        </div>
        {isMarquee && <div className={styles.marqueeBox} style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.width, height: marqueeRect.height }} />}
      </div>
      {isPreviewMode && <Preview />}
    </>
  );
};

export default MindMap;