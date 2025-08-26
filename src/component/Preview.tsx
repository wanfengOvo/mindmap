import React, { useRef, useState, useCallback, type JSX } from 'react';
import { useMindMap } from '../context/MindMapContext';
import type { MindMapNode as NodeData } from '../types';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './MindMap';
import Node from './Node';
import Edge from './Edge';
import styles from './Preview.module.css';
import domtoimage from 'dom-to-image-more';
import { getAllNodes } from '../utils/util';


const renderNodes = (node: NodeData): JSX.Element[] => {

    const elements = [<Node key={node.id} node={node} isHighlighted={false} />];
    if (Array.isArray(node.children) && !node.isCollapsed) {
        node.children.forEach(child => elements.push(...renderNodes(child)));
    }
    return elements;
};
const renderEdges = (node: NodeData): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    if (Array.isArray(node.children) && !node.isCollapsed) {
        node.children.forEach(child => {
            elements.push(<Edge key={`${node.id}-${child.id}`} fromNode={node} toNode={child} isHighlighted={false} />);
            elements.push(...renderEdges(child));
        });
    }
    return elements;
};


const Preview: React.FC = () => {
    const { state, dispatch } = useMindMap();
    const { history, currentIndex } = state;
    const currentMindMap = history[currentIndex];

    const [isExporting, setIsExporting] = useState(false);
    const previewSceneRef = useRef<HTMLDivElement>(null);


    const handleExport = useCallback(async () => {
        const sceneElement = previewSceneRef.current;
        if (!sceneElement) return;
        setIsExporting(true);
        try {
            const dataUrl = await domtoimage.toPng(sceneElement, { bgcolor: '#ffffff' });
            const link = document.createElement('a');
            link.download = 'mind-map.png';
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to export from preview:', error);
        } finally {
            setIsExporting(false);
        }
    }, []);

    if (!currentMindMap) return null;


    const allNodes = getAllNodes(currentMindMap);
    const PADDING = 100;
    const minX = Math.min(...allNodes.map(n => n.position.x));
    const minY = Math.min(...allNodes.map(n => n.position.y));
    const maxX = Math.max(...allNodes.map(n => n.position.x));
    const maxY = Math.max(...allNodes.map(n => n.position.y));
    const lastNode = allNodes[allNodes.length - 1];
    const contentWidth = maxX - minX + (lastNode?.size?.width ?? DEFAULT_NODE_WIDTH);
    const contentHeight = maxY - minY + (lastNode?.size?.height ?? DEFAULT_NODE_HEIGHT);
    const finalWidth = contentWidth + PADDING;
    const finalHeight = contentHeight + PADDING;


    const transformNodeForPreview = (node: NodeData): NodeData => ({
        ...node,
        position: {
            x: node.position.x - minX + PADDING / 2,
            y: node.position.y - minY + PADDING / 2,
        },
        children: node.children.map(transformNodeForPreview),
    });
    const previewMap = transformNodeForPreview(currentMindMap);

    return (
        <div className={styles.overlay}>
            <div className={styles.previewToolbar}>
                <button onClick={handleExport} disabled={isExporting}>
                    {isExporting ? '导出中...' : '导出为 PNG'}
                </button>
                <button onClick={() => dispatch({ type: 'TOGGLE_PREVIEW_MODE' })}>
                    关闭预览
                </button>
            </div>
            <div className={styles.previewContainer}>
                <div
                    ref={previewSceneRef}
                    className={styles.previewScene}
                    style={{ width: finalWidth, height: finalHeight }}
                >

                    <svg className={styles.svgLayer} style={{ overflow: 'visible' }}>
                        <g>{renderEdges(previewMap)}</g>
                    </svg>
                    <div className={styles.nodeLayer}>
                        {renderNodes(previewMap)}
                    </div>
                </div>
            </div>
        </div>
    );
};



export default Preview;