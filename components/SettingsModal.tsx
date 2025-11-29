import React from 'react';
import { X, Keyboard, Video, Timer, FileVideo } from 'lucide-react';

export interface AppSettings {
  useCountdown: boolean;
  preferMp4: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1c1c1e] w-full max-w-md rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gray-800/30">
          <h2 className="text-lg font-medium text-white">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Recording Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Video className="w-3 h-3" /> Recording
            </h3>
            
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Countdown</div>
                  <div className="text-xs text-gray-500">Wait 3 seconds before recording</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.useCountdown}
                  onChange={(e) => onUpdateSettings({ ...settings, useCountdown: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Prefer MP4</div>
                  <div className="text-xs text-gray-500">Try to save as .mp4 instead of .webm</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.preferMp4}
                  onChange={(e) => onUpdateSettings({ ...settings, preferMp4: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </section>

          <div className="h-px bg-gray-800" />

          {/* Shortcuts Section */}
          <section className="space-y-4">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Keyboard className="w-3 h-3" /> Shortcuts
            </h3>
            <div className="space-y-2">
               <ShortcutRow label="Quick Capture" keys={['Cmd', 'Shift', '2']} />
               <ShortcutRow label="Stop Recording" keys={['Esc']} />
               <ShortcutRow label="Toggle Camera" keys={['C']} />
            </div>
          </section>

        </div>
        
        <div className="bg-gray-800/30 px-6 py-4 border-t border-gray-700/50 text-center">
            <p className="text-xs text-gray-500">BetaScreenCap v1.0.2</p>
        </div>
      </div>
    </div>
  );
};

const ShortcutRow: React.FC<{ label: string, keys: string[] }> = ({ label, keys }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-300">{label}</span>
    <div className="flex gap-1">
      {keys.map(k => (
        <kbd key={k} className="px-2 py-1 bg-gray-800 rounded-md border border-gray-700 text-xs font-mono text-gray-400 min-w-[24px] text-center">
          {k}
        </kbd>
      ))}
    </div>
  </div>
);