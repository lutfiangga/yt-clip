import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sparkles, Video } from 'lucide-react';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';
import History from './components/History';

const queryClient = new QueryClient();

function App() {
  const [jobId, setJobId] = useState(null);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
        <header className="border-b border-gray-800/60 bg-gray-900/20 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400">
              <Sparkles size={24} className="fill-blue-500/20" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Clipper AI
              </span>
            </div>
             {jobId && <button onClick={() => setJobId(null)} className="text-gray-400 hover:text-white text-sm">New Project</button>}
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-12">
          {!jobId ? (
            <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center space-y-4 max-w-2xl">
                <h1 className="text-5xl font-bold tracking-tight text-white">
                  Turn Long Videos into <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    Viral Clips Instantly
                  </span>
                </h1>
                <p className="text-lg text-gray-400">
                  AI-powered extraction, auto-reframing (9:16), and highlight detection.
                  No subtitles, just pure visual storytelling.
                </p>
              </div>

              <div className="w-full mt-8">
                <UploadSection onJobCreated={setJobId} />
              </div>

              <History onSelectJob={setJobId} />
            </div>
          ) : (
            <Dashboard jobId={jobId} />
          )}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
