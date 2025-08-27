import React, { useRef,useState } from 'react';
import { useMindMap } from '../context/MindMapContext';
import type { MindMapNode as NodeData } from '../types';
import OutlineItem from './OutlineItem';
import styles from './OutlineView.module.css';
import { updateNodeInTree,findNodeInTree } from '../context/MindMapContext';
import { isDescendant,detachNodeFromTree } from '../utils/util';



const OutlineView: React.FC = () => {
    const { state, dispatch, updateTree } = useMindMap();
    const currentMindMap = state.history[state.currentIndex];
    const draggedNodeId = useRef<string | null>(null);
    const [dropHighlightId, setDropHighlightId] = useState<string | null>(null);
    const handleUpdateText = (nodeId: string, text: string) => {
        const newTree = updateNodeInTree(currentMindMap, nodeId, (node) => ({ ...node, text }));
        updateTree(newTree);
    };

    // 递归渲染函数
    const renderOutline = (nodes: NodeData[], level: number): React.ReactNode => {
        return (
            <ul>
                {nodes.map(node => (
                    <React.Fragment key={node.id}>
                        <OutlineItem node={node} level={level} onUpdateText={handleUpdateText} onDragStart={(id) => draggedNodeId.current = id}
                            onDrop={handleDrop} isDropHighlight={dropHighlightId === node.id}
                            onDragOverItem={setDropHighlightId}/>
                        {node.children && node.children.length > 0 && renderOutline(node.children, level + 1)}
                    </React.Fragment>
                ))}
            </ul>
        );
    };
    const handleDrop = (targetNodeId: string) => {
        const draggedId = draggedNodeId.current;
        setDropHighlightId(null); // 清除高亮

        // --- 验证 ---
        if (!draggedId || draggedId === targetNodeId || draggedId === 'root') return;
        
        const draggedNodeData = findNodeInTree(currentMindMap, draggedId);
        if (!draggedNodeData) return;

        // 验证：不能拖到自己的父节点下 (因为它已经在那里了)
        if (draggedNodeData.parentId === targetNodeId) return;

        // 验证：不能拖到自己的子孙节点下
        const targetNodeData = findNodeInTree(currentMindMap, targetNodeId);
        if (!targetNodeData || isDescendant(targetNodeId, draggedNodeData)) {
            console.warn("Cannot move a node into its own descendant.");
            return;
        }

        // --- 执行操作 ---
        // 1. "剪切"
        const { newTree: treeWithoutNode, detachedNode } = detachNodeFromTree(currentMindMap, draggedId);
        
        if (detachedNode) {
            // 2. "粘贴"
            const finalTree = updateNodeInTree(treeWithoutNode, targetNodeId, parentNode => ({
                ...parentNode,
                children: [...parentNode.children, { ...detachedNode, parentId: parentNode.id }]
            }));
            // 3. 更新状态，这将创建一个新的、可撤销的历史记录
            updateTree(finalTree);
        }
    };
    return (
        <div className={styles.outlineContainer}>
            <div className={styles.outlineToolbar}>
                <h2>大纲视图</h2>
                <button onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'canvas' })}>
                    返回画布
                </button>
            </div>
            <div className={styles.outlineContent}>
                {renderOutline([currentMindMap], 0)}
            </div>
        </div>
    );
};

export default OutlineView;