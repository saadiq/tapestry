import './index.css';
import { useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileTreeProvider } from './store/fileTreeStore';
import { EditorComponent } from './components/Editor/EditorComponent';

function App() {
  const [content, setContent] = useState('<h1>Welcome to Tapestry</h1><p>Start editing your document...</p>');

  const handleUpdate = (newContent: string) => {
    setContent(newContent);
    console.log('Content updated:', newContent);
  };

  return (
    <FileTreeProvider>
      <div className="flex h-full w-full bg-base-100">
        {/* Sidebar with File Tree (Track C) */}
        <Sidebar />

        {/* Main Editor Area (Track A) */}
        <div className="flex-1 flex flex-col bg-base-200">
          <EditorComponent
            content={content}
            onUpdate={handleUpdate}
            placeholder="Start typing your document..."
            editable={true}
          />
        </div>
      </div>
    </FileTreeProvider>
  );
}

export default App;
