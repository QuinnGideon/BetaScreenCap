
import React from 'react';
import { Camera, Video, Settings, User, UserX, MousePointer2 } from 'lucide-react';

interface ToolbarProps {
  onCapture: () => void;
  onRecord: () => void;
  isRecording: boolean;
  onToggleCamera: () => void;
  isCameraOn: boolean;
  onOpenSettings: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  onCapture, 
  onRecord, 
  isRecording,
  onToggleCamera,
  isCameraOn,
  onOpenSettings
}) => {
  if (isRecording) return null; // Hide main toolbar when recording

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-850/90 backdrop-blur-xl border border-gray-700 p-2 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-slide-up">
      <div className="flex items-center gap-1 px-2 border-r border-gray-700">
        <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 cursor-pointer transition-colors" title="Close" />
        <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 cursor-pointer transition-colors" title="Minimize" />
        <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 cursor-pointer transition-colors" title="Maximize" />
      </div>

      <button 
        onClick={onCapture}
        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-700 transition-colors group"
      >
        <Camera className="w-6 h-6 text-white group-hover:text-blue-400 transition-colors" />
        <span className="text-[10px] text-gray-400 font-medium">Capture</span>
      </button>

      <button 
        onClick={onRecord}
        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-700 transition-colors group"
      >
        <Video className="w-6 h-6 text-white group-hover:text-red-400 transition-colors" />
        <span className="text-[10px] text-gray-400 font-medium">Record</span>
      </button>

      <div className="w-px h-8 bg-gray-700 mx-1" />

      <button 
        onClick={onToggleCamera}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors group ${isCameraOn ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
      >
        {isCameraOn ? (
            <User className="w-6 h-6 text-green-400 transition-colors" />
        ) : (
            <UserX className="w-6 h-6 text-white group-hover:text-green-400 transition-colors" />
        )}
        <span className={`text-[10px] font-medium ${isCameraOn ? 'text-green-400' : 'text-gray-400'}`}>Camera</span>
      </button>

      <div className="w-px h-8 bg-gray-700 mx-1" />

      <button 
        onClick={onOpenSettings}
        className="p-2 rounded-xl hover:bg-gray-700 transition-colors"
      >
        <Settings className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  );
};
