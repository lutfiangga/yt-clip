import { useQuery } from '@tanstack/react-query';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/Button';

export default function History({ onSelectJob }) {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: api.getJobs,
    refetchInterval: 5000
  });

  if (isLoading) return null;

  // Filter only main jobs (not sub-tasks like render_clip, unless we want to show them)
  const mainJobs = jobs?.filter(j => 
    ['process_upload', 'download_video'].includes(j.type)
  ) || [];

  if (mainJobs.length === 0) return null;

  return (
    <div className="mt-16 border-t border-gray-800 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <h3 className="text-xl font-bold mb-6 text-gray-300 flex items-center gap-2">
        <Clock size={20} /> Recent Projects
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainJobs.map((job) => (
          <div 
            key={job.id} 
            className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-all cursor-pointer group"
            onClick={() => onSelectJob(job.id)}
          >
            <div className="flex justify-between items-start mb-2">
               <span className="text-xs font-mono text-gray-500">
                 {new Date(job.createdAt).toLocaleDateString()}
               </span>
               <div>
                  {job.status === 'completed' && <CheckCircle2 size={16} className="text-green-500" />}
                  {job.status === 'processing' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                  {job.status === 'failed' && <AlertCircle size={16} className="text-red-500" />}
               </div>
            </div>
            
            <h4 className="font-medium text-gray-200 truncate pr-2">
              {job.data?.originalName || job.data?.url || "Untitled Project"}
            </h4>
            
            <div className="mt-4 flex justify-between items-end">
               <span className="text-xs text-gray-500 uppercase">{job.type.replace('_', ' ')}</span>
               <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                 Open Dashboard &rarr;
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
