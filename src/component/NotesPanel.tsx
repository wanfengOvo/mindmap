import React, { useEffect, useRef } from 'react';
import { useMindMap } from '../context/MindMapContext';
import styles from './NotesPanel.module.css';
import { updateNodeInTree,findNodeInTree } from '../context/MindMapContext';




const NotesPanel: React.FC = () => {
    const { state, dispatch, updateTree } = useMindMap();
    const { history, currentIndex, activeNotesNodeId } = state;
    const currentMindMap = history[currentIndex];
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 当 activeNotesNodeId 改变时，自动聚焦到输入框
    useEffect(() => {
        if (activeNotesNodeId && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [activeNotesNodeId]);

    if (!activeNotesNodeId) {
        return null; // 如果没有节点被选中来查看备注，则不渲染任何东西
    }
    
    const activeNode = findNodeInTree(currentMindMap, activeNotesNodeId);

    if (!activeNode) {
        // 安全起见，如果找不到节点，也关闭面板
        dispatch({ type: 'SET_ACTIVE_NOTES_NODE', payload: null });
        return null;
    }

    const handleNotesChange = (notes: string) => {
        const newTree = updateNodeInTree(currentMindMap, activeNotesNodeId, node => ({
            ...node,
            notes: notes,
        }));
        updateTree(newTree);
    };

    const closePanel = () => {
        dispatch({ type: 'SET_ACTIVE_NOTES_NODE', payload: null });
    };

    return (
        <div className={styles.notesPanel}>
            <div className={styles.header}>
                <h3>备注 for "{activeNode.text}"</h3>
                <button className={styles.closeButton} onClick={closePanel}>×</button>
            </div>
            <div className={styles.content}>
                <textarea
                    ref={textareaRef}
                    className={styles.notesTextarea}
                    placeholder="为这个节点添加一些详细信息..."
                    value={activeNode.notes || ''}
                    onChange={e => handleNotesChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default NotesPanel;