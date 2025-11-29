import React from 'react';
import { Pencil, Copy, Save, Trash2, type LucideIcon, Download, Sparkles, X } from 'lucide-react';
import { CapturedMedia } from '../types';

interface QuickAccessProps {
  media: CapturedMedia;
  onEdit: () => void;
  onClose: () => void;
  onSave: () => void;
  onCopy: () => void;
  onOCR?: () => void;
}

export const QuickAccess: React.FC<QuickAccessProps> = ({ media, onEdit, onClose, onSave, onCopy, onOCR }) => {
  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-50 animate-slide-up group">
      
      {/* Thumbnail Preview Card */}
      <div 
        className="relative rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl bg-[#1c1c1e] w-72 aspect-video cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-3xl"
        onClick={onEdit}
      >
        {/* Close Button overlay (visible on hover) */}
        <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-2 left-2 p-1 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500"
        >
            <X className="w-3 h-3" />
        </button>

        {media.type === 'image' ? (
           <img src={media.url} alt="Capture" className="w-full h-full object-contain bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[#111]" />
        ) : (
           <video src={media.url} className="w-full h-full object-contain bg-black" muted autoPlay loop />
        )}
        
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-white font-medium bg-black/60 px-4 py-1.5 rounded-full text-sm backdrop-blur-md border border-white/10 shadow-xl">Annotate</span>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="flex items-center gap-1 bg-[#2c2c2e]/90 backdrop-blur-xl border border-gray-600/50 p-1.5 rounded-xl shadow-2xl scale-95 origin-right animate-fade-in">
        <ActionButton icon={Pencil} label="Annotate" onClick={onEdit} />
        <div className="w-px h-4 bg-gray-600/50 mx-1" />
        <ActionButton icon={Copy} label="Copy" onClick={onCopy} />
        <ActionButton icon={Download} label="Save" onClick={onSave} />
        {media.type === 'image' && onOCR && (
             <ActionButton icon={Sparkles} label="Text" onClick={onOCR} color="text-purple-400 hover:text-purple-300" />
        )}
        <div className="w-px h-4 bg-gray-600/50 mx-1" />
        <ActionButton icon={Trash2} label="Discard" onClick={onClose} color="text-red-400 hover:text-red-300" />
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: LucideIcon, label: string, onClick: () => void, color?: string }> = ({ icon: Icon, label, onClick, color = "text-gray-300 hover:text-white" }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`p-2 rounded-lg transition-all relative group hover:bg-white/10 ${color}`}
  >
    <Icon className="w-4 h-4" />
    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-800">
      {label}
    </span>
  </button>
);