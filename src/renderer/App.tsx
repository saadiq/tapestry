import './index.css';
import { FileText, Folder, Settings, Sparkles } from 'lucide-react';

function App() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <Sparkles className="h-12 w-12 text-primary" />
          <h2 className="card-title text-2xl">Welcome to Tapestry</h2>
          <p>Your AI-powered document workspace</p>

          <div className="divider"></div>

          <div className="flex w-full flex-col gap-2">
            <button className="btn btn-primary">
              <Folder className="h-4 w-4" />
              Open Folder
            </button>
            <button className="btn btn-outline">
              <FileText className="h-4 w-4" />
              New Document
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <div className="badge badge-success">Phase 1 Complete</div>
            <div className="badge badge-info">Tailwind + DaisyUI</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="stat bg-base-100 shadow">
          <div className="stat-figure text-primary">
            <FileText className="h-8 w-8" />
          </div>
          <div className="stat-title">Editor</div>
          <div className="stat-value text-sm">TipTap Ready</div>
        </div>

        <div className="stat bg-base-100 shadow">
          <div className="stat-figure text-secondary">
            <Folder className="h-8 w-8" />
          </div>
          <div className="stat-title">File System</div>
          <div className="stat-value text-sm">Ready</div>
        </div>

        <div className="stat bg-base-100 shadow">
          <div className="stat-figure text-accent">
            <Settings className="h-8 w-8" />
          </div>
          <div className="stat-title">UI</div>
          <div className="stat-value text-sm">Styled</div>
        </div>
      </div>
    </div>
  );
}

export default App;
