
import React, { useEffect, useState, useRef } from 'react';
import { Move, VideoOff, PictureInPicture, Eye, EyeOff } from 'lucide-react';

interface DraggableCameraProps {
  stream: MediaStream | null;
  onPositionChange: (pos: { x: number; y: number; size: number }) => void;
  size?: number;
  videoRef: React.RefObject<HTMLVideoElement>; // Shared Ref
}

export const DraggableCamera: React.FC<DraggableCameraProps> = ({ stream, onPositionChange, size = 192, videoRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 32, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // State to track if we are actually receiving video data
  const [hasVideoSignal, setHasVideoSignal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Handle Stream Updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream || !stream.active) {
        setHasVideoSignal(false);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    video.srcObject = stream;
    video.muted = true; // Prevent audio feedback

    // Robust play attempt
    const tryPlay = async () => {
        try {
            await video.play();
        } catch (e) {
            console.warn("Autoplay blocked or interrupted", e);
        }
    };
    tryPlay();

    // Listeners to determine if video is truly working
    const handlePlaying = () => {
        setIsLoading(false);
        setHasVideoSignal(true);
    };

    const handleWaiting = () => {
        // Only set loading if we haven't rendered yet
        if (video.currentTime === 0) setIsLoading(true);
    };

    const handleError = (e: any) => {
        console.error("Video error", e);
        setHasVideoSignal(false);
        setIsLoading(false);
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handlePlaying); // Fallback if playing event misses
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);

    return () => {
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('timeupdate', handlePlaying);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('error', handleError);
    };
  }, [stream, videoRef]);

  // Notify parent of position
  useEffect(() => {
      onPositionChange({ ...pos, size: isVisible ? size : 0 });
  }, [pos, size, onPositionChange, isVisible]);

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.min(Math.max(0, e.clientX - dragStartRef.current.x), window.innerWidth - size);
      const newY = Math.min(Math.max(0, e.clientY - dragStartRef.current.y), window.innerHeight - size);
      setPos({ x: newX, y: newY });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, size]);

  const togglePiP = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!videoRef.current) return;
      try {
          if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
          } else {
              await videoRef.current.requestPictureInPicture();
          }
      } catch (err) {
          console.error("PiP failed", err);
      }
  };

  if (!stream) return null;

  return (
    <div 
      ref={containerRef}
      className={`fixed z-[100] rounded-full shadow-2xl border-[3px] border-white/20 group transition-all duration-200 ${isDragging ? 'cursor-grabbing shadow-blue-500/20 scale-105' : 'cursor-grab hover:border-blue-500/50'}`}
      style={{ 
        width: size, 
        height: size, 
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        touchAction: 'none',
        opacity: isVisible ? 1 : 0.5,
        clipPath: isVisible ? 'none' : 'circle(20% at 50% 50%)'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-full rounded-full overflow-hidden bg-black">
          {/* Main Video Element - Shared Ref */}
          <video 
            ref={videoRef}
            autoPlay 
            muted 
            playsInline
            onLoadedMetadata={(e) => {
                e.currentTarget.play().catch(() => {});
            }}
            className="w-full h-full object-cover transform -scale-x-100 pointer-events-none" 
          />
          
          {/* Loading / Error States */}
          {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
          )}

          {!hasVideoSignal && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500 z-20">
                <VideoOff className="w-8 h-8" />
            </div>
          )}
          
          {/* Hover Controls */}
          <div className={`absolute inset-0 bg-black/40 transition-opacity flex flex-col items-center justify-center gap-2 z-30 ${isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
              <Move className="text-white/80 w-6 h-6 drop-shadow-lg mb-1" />
              <div className="flex items-center gap-2">
                  <button onClick={() => setIsVisible(!isVisible)} className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-colors">
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={togglePiP} className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-colors" title="Pop Out Camera">
                    <PictureInPicture className="w-4 h-4" />
                  </button>
              </div>
          </div>
      </div>
      
      {/* Active Indicator */}
      {isVisible && hasVideoSignal && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)] z-40" />
      )}
    </div>
  );
};
