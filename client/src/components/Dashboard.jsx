import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import ClipList from './ClipList';

export default function Dashboard({ jobId }) {
  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.getJobStatus(jobId),
    refetchInterval: (data) => (data?.status === 'completed' || data?.status === 'failed' ? false : 2000),
  });

  if (isLoading) return <div className="text-center p-10"><Loader2 className="animate-spin mx-auto" /> Loading...</div>;
  if (error) return <div className="text-red-400 text-center p-10">Error loading job</div>;

  const isProcessing = job.status === 'processing' || job.status === 'pending';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Status Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {job.status === 'completed' && <CheckCircle2 className="text-green-400" />}
            {job.status === 'processing' && <Loader2 className="animate-spin text-blue-400" />}
            {job.status === 'failed' && <AlertCircle className="text-red-400" />}
            Job Status: <span className="capitalize text-gray-300">{job.status}</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">ID: {jobId}</p>
        </div>
        {isProcessing && (
          <div className="w-1/3">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-blue-500 transition-all duration-500 ease-out"
                 style={{ width: `${job.progress || 0}%` }}
               />
            </div>
            <p className="text-right text-xs text-gray-500 mt-2">{job.progress}%</p>
          </div>
        )}
      </div>

      {job.status === 'completed' && (
        <div className="bg-gray-800/30 p-8 rounded-xl text-center border border-gray-700">
            <p className="text-gray-400 mb-6">Analysis Complete. Detected {job.data?.clips?.length || 0} highlights.</p>
            {job.data?.clips && (
                <ClipList 
                    clips={job.data.clips} 
                    jobId={jobId} 
                    videoUrl={job.data.filename ? `http://localhost:3000/uploads/${job.data.filename}` : null}
                />
            )}
        </div>
      )}
      
      {job.status === 'failed' && (
          <div className="bg-red-900/20 border border-red-900 p-6 rounded-xl text-center">
              <h3 className="text-red-400 font-bold mb-2">Processing Failed</h3>
              <p className="text-red-300">{job.error}</p>
          </div>
      )}
    </div>
  );
}
