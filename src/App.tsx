
import { MindMapProvider } from './context/MindMapProvider'
import MindMap from './component/MindMap'
import './App.css'

function App() {
 

 return (
    <MindMapProvider>
      <div className="App">
        <h1>React 思维导图</h1>
        <MindMap />
      </div>
    </MindMapProvider>
  );
}

export default App
