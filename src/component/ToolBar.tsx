import React from 'react';
import { useMindMap } from '../context/MindMapContext';
import styles from './Toolbar.module.css';
interface ToolbarProps {
  onExport: () => void;
  isExporting: boolean;
}
const Toolbar: React.FC<ToolbarProps> = ({ onExport, isExporting }) => {
  const { state, dispatch } = useMindMap();
  const { currentIndex, history, selectedNodeId, clipboard } = state;

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const canCopy = selectedNodeId !== null;
  const canPaste = clipboard !== null && selectedNodeId !== null;

  return (
    <div className={styles.toolbar}>
      <button onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo}>撤销</button>
      <button onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo}>重做</button>
      <button onClick={() => dispatch({ type: 'COPY_NODE' })} disabled={!canCopy}>复制</button>
      <button onClick={() => dispatch({ type: 'PASTE_NODE' })} disabled={!canPaste}>粘贴</button>
      <button onClick={onExport} disabled={isExporting}>
        {isExporting ? '导出中...' : '导出为PNG'}
      </button>
    </div>
  );
};

export default Toolbar;