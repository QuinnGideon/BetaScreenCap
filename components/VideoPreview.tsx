
import React from 'react';
import { X, Download, MonitorPlay } from 'lucide-react';
import { CapturedMedia } from '../types';

interface VideoPreviewProps {
  media: CapturedMedia;
  onClose: () => void;
  onSave: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ media, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f12]/95 backdrop-blur-sm flex flex-col animate-fade-in">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-gray-800 bg-[#16161a] shrink-0 z-10">
        <div className="flex items-center gap-4">
            <button onClick={onClose} className="group p-2 rounded-full hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <div className="flex items-center gap-2 text-gray-300">
                <MonitorPlay className="w-4 h-4" />
                <span className="text-sm font-medium">Video Preview</span>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <button onClick={onSave} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20 transition-all hover:shadow-blue-500/30">
                <Download className="w-4 h-4" />
                Save Recording
            </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-[#0f0f12]">
         <div className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black">
             <video 
                src={media.url} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
             />
         </div>
      </div>
    </div>
  );
};
