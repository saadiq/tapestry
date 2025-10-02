import './index.css';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileTreeProvider } from './store/fileTreeStore';

function App() {
  return (
    <FileTreeProvider>
      <div className="flex h-full w-full bg-base-100">
        {/* Sidebar with File Tree */}
        <Sidebar />

        {/* Main Content Area - Placeholder for Editor (Track A) */}
        <div className="flex-1 flex items-center justify-center bg-base-200">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-base-content/60 mb-2">
              Track C: File Tree Complete
            </h2>
            <p className="text-base-content/40">
              Editor component will be integrated here by Track A
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <div className="badge badge-success">Track C Complete</div>
              <div className="badge badge-info">File Tree Navigation</div>
            </div>
          </div>
        </div>
      </div>
    </FileTreeProvider>
  );
}

export default App;
