import React from 'react';
import { useMindMap } from '../context/MindMapContext';
import type { MindMapNode } from '../types';
import styles from './InspectorPanel.module.css';


const DEFAULT_WIDTH = 150;
const DEFAULT_FONT_SIZE = 16;

// --- 辅助函数 (可以从 Node.tsx 复制或提取到公共文件) ---
const updateNodeInTree = (rootNode: MindMapNode, nodeId: string, updateFn: (node: MindMapNode) => MindMapNode): MindMapNode => {
    if (rootNode.id === nodeId) {
        return updateFn(rootNode);
    }
    return {
        ...rootNode,
        children: rootNode.children.map(child => updateNodeInTree(child, nodeId, updateFn))
    };
};

const findNodeInTree = (node: MindMapNode, id: string): MindMapNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findNodeInTree(child, id);
        if (found) return found;
    }
    return null;
}

// 定义一组可用的图标
const ICONS = ['⭐', '💡', '🔥', '✔️', '❓', '❌', '🚀'];

const InspectorPanel: React.FC = () => {
    const { state, updateTree } = useMindMap();
    const { history, currentIndex, selectedNodeId } = state;
    const currentMindMap = history[currentIndex];

    if (!selectedNodeId) {
        return <div className={styles.panel}><p>请选择一个节点</p></div>;
    }
    
    const selectedNode = findNodeInTree(currentMindMap, selectedNodeId);

    if (!selectedNode) {
        return <div className={styles.panel}><p>节点未找到</p></div>;
    }

    const handleIconChange = (icon: string | null) => {
        const newTree = updateNodeInTree(currentMindMap, selectedNodeId, node => ({
            ...node,
            icon: node.icon === icon ? undefined : icon, // 再次点击同一个图标则取消
        }));
        updateTree(newTree);
    };
    
   const handleStyleChange = (property: 'backgroundColor' | 'color' | 'fontSize', value: string | number) => {
        const newTree = updateNodeInTree(currentMindMap, selectedNodeId, node => ({
            ...node,
            style: {
                ...node.style,
                [property]: value,
            },
        }));
        updateTree(newTree);
    };

    const handleEdgeStyleChange = (property: 'type' | 'dashed', value: any) => {
        // 根节点没有入线，所以禁用
        if (selectedNode.id === 'root') return;

        const newTree = updateNodeInTree(currentMindMap, selectedNodeId, node => {
            // 如果是切换虚线，我们简单地反转布尔值
            if (property === 'dashed') {
                const newDashed = !node.edgeStyle?.dashed;
                return {
                    ...node,
                    edgeStyle: { ...node.edgeStyle, dashed: newDashed }
                };
            }
            // 否则，设置类型
            return {
                ...node,
                edgeStyle: { ...node.edgeStyle, [property]: value }
            };
        });
        updateTree(newTree);
    };


    const handleSizeChange = (property: 'width' | 'height', value: number) => {
        const newTree = updateNodeInTree(currentMindMap, selectedNodeId, node => ({
            ...node,
            size: {
                width: property === 'width' ? value : node.size?.width ?? DEFAULT_WIDTH,
                height: property === 'height' ? value : node.size?.height, // Height can be auto
            },
        }));
        updateTree(newTree);
    };


    const handleNotesChange = (notes: string) => {
        const newTree = updateNodeInTree(currentMindMap, selectedNodeId, node => ({
            ...node,
            notes: notes,
        }));
        // 注意：为了性能，我们可以在用户停止输入后再调用 updateTree，
        // 但为了简单和确保撤销/重做能捕获每一个字符，我们暂时在每次改变时都更新。
        updateTree(newTree);
    };

    return (
        <div className={styles.panel}>
            <h4>节点样式</h4>
            
            {/* 图标选择器 */}
            <div className={styles.controlGroup}>
                <label>图标</label>
                <div className={styles.iconSelector}>
                    {ICONS.map(icon => (
                        <button 
                            key={icon}
                            className={`${styles.iconButton} ${selectedNode.icon === icon ? styles.selected : ''}`}
                            onClick={() => handleIconChange(icon)}
                        >
                            {icon}
                        </button>
                    ))}
                </div>
            </div>

            {/* 颜色选择器 */}
            <div className={styles.controlGroup}>
                <label htmlFor="bgColor">背景颜色</label>
                <input 
                    type="color" 
                    id="bgColor" 
                    value={selectedNode.style?.backgroundColor || '#e0e0e0'} 
                    onChange={e => handleStyleChange('backgroundColor', e.target.value)}
                />
            </div>
            <div className={styles.controlGroup}>
                <label htmlFor="textColor">文字颜色</label>
                <input 
                    type="color" 
                    id="textColor" 
                    value={selectedNode.style?.color || '#000000'}
                    onChange={e => handleStyleChange('color', e.target.value)} 
                />
            </div>
             <div className={styles.controlGroup}>
                <label htmlFor="fontSize">字体大小 (px)</label>
                <input
                    type="number"
                    id="fontSize"
                    className={styles.numberInput}
                    value={selectedNode.style?.fontSize || DEFAULT_FONT_SIZE}
                    onChange={e => handleStyleChange('fontSize', parseInt(e.target.value, 10))}
                />
            </div>


            <hr className={styles.divider} />

            <h4>节点尺寸</h4>
            <div className={styles.controlGroup}>
                <label htmlFor="nodeWidth">宽度 (px)</label>
                <input
                    type="number"
                    id="nodeWidth"
                    className={styles.numberInput}
                    value={selectedNode.size?.width || DEFAULT_WIDTH}
                    onChange={e => handleSizeChange('width', parseInt(e.target.value, 10))}
                />
            </div>



            <hr className={styles.divider} />
            
            <h4>连线样式</h4>
            {/* 根节点没有入线，所以禁用这些控件 */}
            {selectedNode.id === 'root' ? <p>根节点没有入线</p> : (
                <>
                    <div className={styles.controlGroup}>
                        <label>形状</label>
                        <div className={styles.buttonGroup}>
                            <button
                                className={selectedNode.edgeStyle?.type !== 'straight' ? styles.selected : ''}
                                onClick={() => handleEdgeStyleChange('type', 'curved')}
                            >
                                曲线
                            </button>
                            <button
                                className={selectedNode.edgeStyle?.type === 'straight' ? styles.selected : ''}
                                onClick={() => handleEdgeStyleChange('type', 'straight')}
                            >
                                直线
                            </button>
                        </div>
                    </div>
                    <div className={styles.controlGroup}>
                        <label>样式</label>
                        <div className={styles.buttonGroup}>
                            <button
                                className={selectedNode.edgeStyle?.dashed ? styles.selected : ''}
                                onClick={() => handleEdgeStyleChange('dashed', true)}
                            >
                                虚线
                            </button>
                        </div>
                    </div>
                    <hr className={styles.divider} />
            <h4>备注</h4>
            <div className={styles.controlGroup}>
                <textarea
                    id="nodeNotes" // id 保持，方便 Node 组件的快捷聚焦
                    className={styles.notesTextarea}
                    placeholder="为这个节点添加一些详细信息..."
                    value={selectedNode.notes || ''}
                    onChange={e => handleNotesChange(e.target.value)}
                />
            </div>
                </>
            )}
        </div>
    );
};

export default InspectorPanel;