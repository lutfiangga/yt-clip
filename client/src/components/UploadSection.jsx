import { useState, useRef } from 'react';
import { Upload, Link, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { api } from '../services/api';

export default function UploadSection({ onJobCreated }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const dropZoneRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile);
    } else {
      setError('Please drop a valid video file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (activeTab === 'upload') {
        if (!file) throw new Error("Please select a file");
        res = await api.uploadVideo(file);
      } else {
        if (!url) throw new Error("Please enter a URL");
        res = await api.submitUrl(url);
      }
      onJobCreated(res.jobId);
    } catch (err) {
      setError(err.message || "Failed to start job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-8">
      <div className="flex bg-gray-900/50 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'upload' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Upload size={18} /> Upload Video
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'url' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Link size={18} /> YouTube URL
        </button>
      </div>

      <div className="min-h-[200px] flex flex-col justify-center">
        {activeTab === 'upload' ? (
          <div 
            ref={dropZoneRef}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging 
                ? 'border-blue-400 bg-blue-900/20 scale-[1.02]' 
                : 'border-gray-600 hover:border-blue-500'
            }`}
          >
            <input
              type="file"
              id="video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-blue-400'}`}>
                <Upload size={32} />
              </div>
              <p className="text-gray-300 font-medium">
                {file ? file.name : (isDragging ? "Drop your video here!" : "Click to browse or drag file")}
              </p>
              <p className="text-gray-500 text-sm">MP4, MOV up to 500MB</p>
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-yellow-900/40 border border-yellow-700/50 rounded-lg text-yellow-200 text-xs">
              ⚠️ <strong>Note:</strong> YouTube has strict bot protections. If this fails, please download the video manually and use the <strong>Upload Video</strong> tab.
            </div>
            <label className="text-sm text-gray-400">Paste Video URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded-lg">
          {error}
        </div>
      )}

      <Button
        className="w-full mt-6 py-3 text-lg"
        onClick={handleSubmit}
        disabled={loading || (!file && !url)}
      >
        {loading ? <div className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Processing...</div> : "Start Magic"}
      </Button>
    </div>
  );
}
