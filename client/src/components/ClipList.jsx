import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Scissors, X, Check, Film } from 'lucide-react';
import { Button } from './ui/Button';
import { api } from '../services/api';

const RATIOS = [
  { value: 9/16, label: '9:16', name: 'TikTok/Reels' },
  { value: 1, label: '1:1', name: 'Square' },
  { value: 16/9, label: '16:9', name: 'YouTube' },
  { value: 4/5, label: '4:5', name: 'Instagram' },
];

export default function ClipList({ clips, jobId, videoUrl }) {
  const [exportingId, setExportingId] = useState(null);
  const [exports, setExports] = useState({}); // { clipIndex: { url, ratio } }
  
  // Preview State for original video
  const [playingIdx, setPlayingIdx] = useState(null);
  const [previewRatio, setPreviewRatio] = useState(9/16);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playingIdx === null) return;

    const clip = clips[playingIdx];
    
    if (Math.abs(video.currentTime - clip.start) > 0.5 && video.currentTime < clip.start) {
        video.currentTime = clip.start;
    }

    const handleTimeUpdate = () => {
        if (video.currentTime >= clip.end) {
            video.pause();
            setPlayingIdx(null);
        }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [playingIdx, clips]);

  const togglePreview = (idx) => {
    if (playingIdx === idx) {
        videoRef.current.pause();
        setPlayingIdx(null);
    } else {
        setPlayingIdx(idx);
        const clip = clips[idx];
        if (videoRef.current) {
            videoRef.current.currentTime = clip.start;
            videoRef.current.play();
        }
    }
  };

  const handleExport = async (clip, index, ratio) => {
    const exportKey = `${index}-${ratio}`;
    setExportingId(exportKey);
    
    try {
      const res = await api.exportClip(jobId, {
        start: clip.start,
        end: clip.end,
        ratio: ratio
      });
      
      const checkStatus = async () => {
         const statusRes = await api.getJobStatus(res.exportJobId);
         if (statusRes.status === 'completed') {
             setExports(prev => ({
                 ...prev,
                 [index]: {
                   url: `http://localhost:3000/outputs/${statusRes.result.outputFilename}`,
                   ratio: ratio
                 }
             }));
             setExportingId(null);
         } else if (statusRes.status === 'failed') {
             alert("Export failed: " + (statusRes.error || "Unknown error"));
             setExportingId(null);
         } else {
             setTimeout(checkStatus, 1500);
         }
      };
      
      checkStatus();
      
    } catch (e) {
      console.error(e);
      alert("Export failed: " + e.message);
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6 mt-8">
       {/* Floating Preview Player */}
       {videoUrl && playingIdx !== null && (
         <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 w-80">
             <div className="p-2 bg-gray-800 text-xs text-gray-400 flex justify-between items-center">
               <span>Preview Clip #{playingIdx + 1}</span>
               <button onClick={() => { videoRef.current?.pause(); setPlayingIdx(null); }} className="hover:text-white">
                 <X size={16} />
               </button>
             </div>
             
             <div className="px-3 py-2 bg-gray-850 border-b border-gray-700 flex gap-1">
               {RATIOS.map(r => (
                 <button 
                   key={r.label}
                   onClick={() => setPreviewRatio(r.value)}
                   className={`px-2 py-1 text-xs rounded transition-all ${previewRatio === r.value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                 >
                   {r.label}
                 </button>
               ))}
             </div>
             
             <div className="relative bg-black flex items-center justify-center" style={{ minHeight: 200 }}>
               <video 
                  ref={videoRef} 
                  src={videoUrl} 
                  className="w-full" 
                  controls={false}
               />
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div 
                   className="border-2 border-blue-400 bg-blue-400/10"
                   style={{
                     aspectRatio: previewRatio,
                     height: previewRatio < 1 ? '100%' : 'auto',
                     width: previewRatio >= 1 ? '100%' : 'auto',
                     maxWidth: '100%',
                     maxHeight: '100%',
                   }}
                 />
               </div>
             </div>
             
             <div className="p-2 bg-gray-800 text-center text-xs text-gray-500">
               Blue box shows export crop area
             </div>
         </div>
       )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {clips.map((clip, idx) => (
        <div key={idx} className={`bg-gray-800 border rounded-xl overflow-hidden transition-all ${playingIdx === idx ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700 hover:border-gray-600'}`}>
          
          {/* If exported, show the video player */}
          {exports[idx] ? (
            <div className="bg-black">
              <video 
                src={exports[idx].url} 
                className="w-full" 
                controls
                style={{ 
                  maxHeight: 400,
                  aspectRatio: exports[idx].ratio 
                }}
              />
              <div className="p-3 bg-gray-900 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Check size={16} /> Exported ({RATIOS.find(r => Math.abs(r.value - exports[idx].ratio) < 0.01)?.label || 'Custom'})
                </div>
                <p className="text-xs text-gray-500">Right-click or use ⋮ to download</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-700 flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-900/40 text-blue-300 text-xs py-0.5 px-2 rounded font-mono border border-blue-900/50">
                            {formatTime(clip.start)} - {formatTime(clip.end)}
                        </span>
                        <span className="text-gray-500 text-xs">
                            {Math.round(clip.end - clip.start)}s
                        </span>
                        {clip.score !== undefined && (
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                clip.score >= 80 ? 'bg-green-900/30 text-green-400 border-green-900' :
                                clip.score >= 60 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900' :
                                'bg-red-900/30 text-red-400 border-red-900'
                            }`}>
                                Score: {clip.score}
                            </span>
                        )}
                    </div>
                    <p className="text-gray-200 text-sm italic font-medium leading-relaxed line-clamp-2">"{clip.text}"</p>
                </div>
                
                <button 
                    onClick={() => togglePreview(idx)}
                    className={`p-3 rounded-full transition-colors flex-shrink-0 ${playingIdx === idx ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    disabled={!videoUrl}
                    title={!videoUrl ? "Preview unavailable" : "Preview Clip"}
                >
                    {playingIdx === idx ? <Pause size={20} className="fill-current" /> : <Play size={20} className="ml-1 fill-current" />}
                </button>
              </div>
              
              <div className="p-4 bg-gray-900/30">
                <div className="flex items-center gap-3 mb-4">
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Export Ratio</label>
                    <select id={`ratio-${idx}`} className="bg-gray-800 text-sm text-gray-200 border border-gray-700 rounded-md px-3 py-1.5 outline-none focus:border-blue-500">
                        {RATIOS.map(r => (
                          <option key={r.label} value={r.value}>{r.label} ({r.name})</option>
                        ))}
                    </select>
                </div>
                
                <Button 
                    className="w-full flex items-center justify-center gap-2 py-2.5"
                    disabled={exportingId !== null}
                    onClick={() => {
                        const ratio = parseFloat(document.getElementById(`ratio-${idx}`).value);
                        handleExport(clip, idx, ratio);
                    }}
                >
                    {exportingId?.startsWith(`${idx}-`) ? (
                        <> <Film size={18} className="animate-pulse" /> Rendering... </>
                    ) : (
                        <> <Scissors size={18} /> Smart Crop & Export </>
                    )}
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
