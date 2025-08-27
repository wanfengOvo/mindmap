import React, { useState, useEffect } from 'react';
import type { MindMapNode as NodeData } from '../types';
import styles from './OutlineView.module.css';

interface OutlineItemProps {
    node: NodeData;
    level: number;
    onUpdateText: (nodeId: string, text: string) => void;
    onDragStart: (nodeId: string) => void;
    onDrop: (targetNodeId: string) => void;
    // 后面我们会添加拖拽相关的 props
    isDropHighlight: boolean;
  onDragOverItem: (nodeId: string | null) => void;
}

const OutlineItem: React.FC<OutlineItemProps> = ({ node, level, onUpdateText, onDragStart, onDrop,isDropHighlight,onDragOverItem }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(node.text);

    useEffect(() => {
        setText(node.text);
    }, [node.text]);

    const handleBlur = () => {
        onUpdateText(node.id, text);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setText(node.text);
            setIsEditing(false);
        }
    };
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(node.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // 必须阻止默认行为才能触发 onDrop
        e.dataTransfer.dropEffect = 'move';
        onDragOverItem(node.id)
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        onDrop(node.id);
    };
    const itemClassName = `${styles.outlineItem} ${isDropHighlight ? styles.dropHighlight : ''}`;
    return (
        <li className={itemClassName} style={{ paddingLeft: `${level * 20}px` }} draggable={node.id !== 'root'}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}>
            <div className={styles.bullet}>•</div>
            {isEditing ? (
                <input
                    type="text"
                    className={styles.outlineInput}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                <div className={styles.outlineText} onDoubleClick={() => setIsEditing(true)}>
                    {node.text}
                </div>
            )}
        </li>
    );
};

export default OutlineItem;