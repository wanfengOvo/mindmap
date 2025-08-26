import React from 'react';
import { useMindMap } from '../context/MindMapContext';
import styles from './Toolbar.module.css';


const Toolbar: React.FC = () => {
  const { state, dispatch } = useMindMap();
  const { currentIndex, history, selectedNodeIds, clipboard } = state;

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const canCopy = selectedNodeIds.length > 0;
  const canCut = selectedNodeIds.length > 0 && !(selectedNodeIds.length === 1 && selectedNodeIds[0] === 'root');
  const canPaste = clipboard !== null && selectedNodeIds.length > 0;

  return (
    <div className={styles.toolbar}>
      <button onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo}>撤销</button>
      <button onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo}>重做</button>
      <button onClick={() => dispatch({ type: 'CUT_NODES' })} disabled={!canCut}>剪切</button>
      <button onClick={() => dispatch({ type: 'COPY_NODE' })} disabled={!canCopy}>复制</button>
      <button onClick={() => dispatch({ type: 'PASTE_NODE' })} disabled={!canPaste}>粘贴</button>
      <button onClick={() => dispatch({ type: 'TOGGLE_PREVIEW_MODE' })}>
        预览与导出
      </button>
    </div>
  );
};

export default Toolbar;