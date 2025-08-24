import MindMap from './component/MindMap';
import InspectorPanel from './component/InspectorPanel';
import NotesPanel from './component/NotesPanel';
// 导入路径变得更简洁了
import { MindMapProvider } from './context/MindMapProvider';
import './App.css';

function App() {
  return (
    <MindMapProvider>
      <div className="App">
        <MindMap />
        <InspectorPanel />
        <NotesPanel />
      </div>
    </MindMapProvider>
  );
}

export default App;