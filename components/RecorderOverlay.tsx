import React, { useState, useEffect } from 'react';
import { Square, Pause, Mic, MicOff, Play } from 'lucide-react';

interface RecorderOverlayProps {
  onStop: () => void;
  stream: MediaStream;
}

export const RecorderOverlay: React.FC<RecorderOverlayProps> = ({ onStop, stream }) => {
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true); // Assuming we requested it

  useEffect(() => {
    const timer = setInterval(() => {
        if (!isPaused) setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleMic = () => {
      // In a real implementation, we would mute the audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setMicEnabled(audioTrack.enabled);
      }
  };

  return (
    <div className="fixed top-8 right-8 flex items-center gap-3 bg-gray-900/90 backdrop-blur-lg border border-red-500/30 p-2 pl-4 rounded-full shadow-2xl z-50 animate-slide-up">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm font-medium text-white min-w-[48px]">{formatTime(duration)}</span>
        </div>

        <div className="h-4 w-px bg-gray-700" />

        <button onClick={toggleMic} className={`p-1.5 rounded-full ${micEnabled ? 'text-white hover:bg-gray-700' : 'text-red-400 bg-red-900/20'}`}>
            {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <button onClick={() => setIsPaused(!isPaused)} className="p-1.5 text-white hover:bg-gray-700 rounded-full">
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        <button onClick={onStop} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg shadow-red-500/20">
            <Square className="w-4 h-4 fill-current" />
        </button>
    </div>
  );
};
