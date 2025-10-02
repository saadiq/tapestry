import './index.css';
import { useState } from 'react';
import { EditorComponent } from './components/Editor/EditorComponent';

function App() {
  const [content, setContent] = useState('<h1>Welcome to Tapestry</h1><p>Start editing your document...</p>');

  const handleUpdate = (newContent: string) => {
    setContent(newContent);
    console.log('Content updated:', newContent);
  };

  return (
    <div className="flex h-full w-full flex-col bg-base-200">
      <EditorComponent
        content={content}
        onUpdate={handleUpdate}
        placeholder="Start typing your document..."
        editable={true}
      />
    </div>
  );
}

export default App;
