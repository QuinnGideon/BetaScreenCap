
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { QuickAccess } from './components/QuickAccess';
import { Editor } from './components/Editor';
import { VideoPreview } from './components/VideoPreview';
import { RecorderOverlay } from './components/RecorderOverlay';
import { DraggableCamera } from './components/DraggableCamera';
import { SettingsModal, AppSettings } from './components/SettingsModal';
import { captureScreen, blobToBase64 } from './services/mediaService';
import { extractTextFromImage, describeImage } from './services/geminiService';
import { AppMode, CapturedMedia } from './types';
import { Sparkles, X, Download } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.IDLE);
  const [media, setMedia] = useState<CapturedMedia | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  
  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    useCountdown: true, // Enabled by default
    preferMp4: true,
  });

  // Countdown State
  const [countdown, setCountdown] = useState<number | null>(null);

  // Recording State
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Camera State
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraPosRef = useRef({ x: 32, y: 100, size: 192 });
  const cameraVideoRef = useRef<HTMLVideoElement>(null); // Shared Ref for Camera Video
  
  // Refs for cleanup
  const cameraStreamRef = useRef<MediaStream | null>(null);
  
  // Compositor Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync ref
  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  // Cleanup URLs only when media changes
  useEffect(() => {
    return () => {
      if (media?.url) URL.revokeObjectURL(media.url);
    };
  }, [media]);

  // Cleanup Camera only on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
         cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
      }
    };
  }, []);

  // Handlers
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setIsCameraOn(false);
  }, [cameraStream]);

  const handleToggleCamera = useCallback(async () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                frameRate: { ideal: 30 }
            },
            audio: false 
        });
        
        stream.getVideoTracks()[0].onended = () => stopCamera();

        setCameraStream(stream);
        setIsCameraOn(true);
      } catch (e) {
        console.error("Camera access failed", e);
        const error = e as Error;
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
             alert("Camera access was denied. Please check your browser permission settings.");
        } else {
             alert(`Could not access camera: ${error.message}`);
        }
      }
    }
  }, [isCameraOn, stopCamera]);

  const playShutterSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const t = ctx.currentTime;
      
      // 1. High frequency snap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.1);
      
      // 2. White noise burst (mechanical feel)
      const bufferSize = ctx.sampleRate * 0.1; // 0.1s
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.1, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

      // Clean up after sound
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close();
      }, 200);

    } catch (e) {
      console.warn("Audio context failed for shutter", e);
    }
  };

  const handleCapture = useCallback(async () => {
    try {
      setMode(AppMode.IDLE);
      await new Promise(r => setTimeout(r, 100));
      const blob = await captureScreen();
      
      // Provide feedback
      playShutterSound();
      
      const url = URL.createObjectURL(blob);
      setMedia({ type: 'image', url, blob });
      setMode(AppMode.QUICK_ACCESS);
    } catch (e) {
      const error = e as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          console.debug("Capture cancelled by user");
          return;
      }
      
      console.error("Capture failed", e);
      alert("Could not capture screen.");
    }
  }, []);

  const handleUpdateMedia = (newMedia: CapturedMedia) => {
    if (media?.url && media.url !== newMedia.url) URL.revokeObjectURL(media.url);
    setMedia(newMedia);
  };

  const playCountdownBeep = (frequency: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.type = 'sine';
      
      // Short, distinct beep
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.2);

      // Clean up
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close();
      }, 250);
    } catch (e) {
      console.warn("Audio context failed for beep", e);
    }
  };

  const startCountdown = async (): Promise<void> => {
      return new Promise(resolve => {
          setCountdown(3);
          playCountdownBeep(880); // A5
          let count = 3;
          const timer = setInterval(() => {
              count--;
              if (count > 0) {
                  setCountdown(count);
                  playCountdownBeep(880); // A5
              } else {
                  clearInterval(timer);
                  setCountdown(null);
                  playCountdownBeep(1760); // A6 (High pitch for "Go")
                  resolve();
              }
          }, 1000);
      });
  };

  const handleRecord = async () => {
    try {
      // 0. Auto-Trigger PiP (MUST be first to catch user gesture)
      if (isCameraOn && cameraVideoRef.current && !document.pictureInPictureElement) {
          try {
             await cameraVideoRef.current.requestPictureInPicture();
          } catch(e) {
             console.warn("Auto-PiP blocked (likely lost gesture or already active)", e);
          }
      }

      // 1. Get Screen Stream (Prompt)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true 
      });

      // 1.5 Handle Countdown (if enabled)
      if (settings.useCountdown) {
          await startCountdown();
      }

      // 2. Setup Audio Context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const dest = audioContext.createMediaStreamDestination();
      
      // Keep-Alive Oscillator (Prevents background tab throttling)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; 
      gainNode.gain.value = 0.001; // Silent
      oscillator.connect(gainNode).connect(dest);
      oscillator.start();

      // Mix System Audio
      if (screenStream.getAudioTracks().length > 0) {
          const sysSource = audioContext.createMediaStreamSource(screenStream);
          const sysGain = audioContext.createGain();
          sysGain.gain.value = 0.8; 
          sysSource.connect(sysGain).connect(dest);
      }
      
      // Mix Mic Audio
      let micStream: MediaStream | null = null;
      try {
         micStream = await navigator.mediaDevices.getUserMedia({ 
             audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
         });
         if (micStream.getAudioTracks().length > 0) {
            const micSource = audioContext.createMediaStreamSource(micStream);
            const compressor = audioContext.createDynamicsCompressor();
            micSource.connect(compressor).connect(dest);
         }
      } catch (e) {
        console.warn("Mic access denied or ignored", e);
        alert("Microphone access was denied. Recording will proceed without your voice.");
      }

      // 4. Setup Compositor
      let finalStream = screenStream;

      if (isCameraOn && cameraStream) {
         const canvas = document.createElement('canvas');
         canvasRef.current = canvas;
         const ctx = canvas.getContext('2d', { alpha: false });
         
         const screenVideo = document.createElement('video');
         screenVideo.srcObject = screenStream;
         screenVideo.muted = true;
         await screenVideo.play();

         // Match canvas size to screen resolution
         canvas.width = screenVideo.videoWidth;
         canvas.height = screenVideo.videoHeight;

         const draw = () => {
            if (!ctx) return;
            
            // Handle screen resolution changes
            if (canvas.width !== screenVideo.videoWidth || canvas.height !== screenVideo.videoHeight) {
                canvas.width = screenVideo.videoWidth;
                canvas.height = screenVideo.videoHeight;
            }

            ctx.drawImage(screenVideo, 0, 0);

            // Draw Camera using the SHARED video element
            const cameraEl = cameraVideoRef.current;
            const currentCamStream = cameraStreamRef.current;

            if (currentCamStream && currentCamStream.active && cameraEl && !cameraEl.paused) {
                const { x, y, size } = cameraPosRef.current;
                
                if (size > 0) { 
                    const scaleX = canvas.width / window.innerWidth;
                    const scaleY = canvas.height / window.innerHeight;
                    
                    const camX = x * scaleX;
                    const camY = y * scaleY;
                    const camSize = size * scaleX; 

                    // FIX: Calculate center crop to prevent stretching
                    const vidW = cameraEl.videoWidth;
                    const vidH = cameraEl.videoHeight;
                    const cropSize = Math.min(vidW, vidH);
                    const sx = (vidW - cropSize) / 2;
                    const sy = (vidH - cropSize) / 2;

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(camX + camSize/2, camY + camSize/2, camSize/2, 0, Math.PI * 2);
                    ctx.clip();
                    
                    ctx.translate(camX + camSize, camY);
                    ctx.scale(-1, 1);
                    
                    // Draw the center-cropped square from the video source
                    ctx.drawImage(
                        cameraEl, 
                        sx, sy, cropSize, cropSize, // Source: Center crop
                        0, 0, camSize, camSize      // Dest: Square bubble
                    );
                    ctx.restore();
                    
                    ctx.beginPath();
                    ctx.arc(camX + camSize/2, camY + camSize/2, camSize/2, 0, Math.PI * 2);
                    ctx.lineWidth = 4 * scaleX;
                    ctx.strokeStyle = '#fff';
                    ctx.stroke();
                }
            }
         };
         
         // Use setInterval instead of requestAnimationFrame
         // This is CRITICAL for background tab recording
         const FPS = 30;
         compositorIntervalRef.current = setInterval(draw, 1000 / FPS);
         
         const canvasStream = canvas.captureStream(FPS);
         finalStream = canvasStream;
      }

      // 5. Start Recording
      const combinedTracks = [...finalStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
      const combinedStream = new MediaStream(combinedTracks);
      setRecordingStream(combinedStream);
      
      // MimeType Priority (Respect Settings)
      const mimeCandidates = settings.preferMp4 
        ? ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']
        : ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
        
      const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type));
      
      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5000000 });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (compositorIntervalRef.current) {
            clearInterval(compositorIntervalRef.current);
            compositorIntervalRef.current = null;
        }
        
        const type = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        setMedia({ type: 'video', url, blob });
        setMode(AppMode.QUICK_ACCESS);
        
        // Stop all tracks
        screenStream.getTracks().forEach(t => t.stop());
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        if (finalStream !== screenStream) finalStream.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        
        setRecordingStream(null);
      };

      screenStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') recorder.stop();
      };

      recorder.start(1000);
      setMode(AppMode.RECORDING);

    } catch (e) {
      const error = e as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          console.log("Recording cancelled by user");
      } else {
          console.error("Record failed", error);
          alert(`Failed to start recording: ${error.message}`);
      }
    }
  };

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleSave = (blobToSave?: Blob) => {
    const b = blobToSave || media?.blob;
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    let filename = `Screenshot ${new Date().toISOString()}.png`;
    if (media?.type === 'video') {
        const type = b.type.toLowerCase();
        let ext = 'webm';
        if (type.includes('mp4')) ext = 'mp4';
        filename = `Screen Recording ${new Date().toISOString()}.${ext}`;
    }
    a.download = filename;
    a.click();
    setMode(AppMode.IDLE);
    setMedia(null);
  };

  const handleCopy = () => {
    if (media?.type === 'image' && media.blob) {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': media.blob })])
        .then(() => setMode(AppMode.IDLE));
    }
  };

  const handleOCR = async () => {
    if (!media?.blob || media.type !== 'image') return;
    setIsProcessing(true);
    try {
      const b64 = await blobToBase64(media.blob);
      const text = await extractTextFromImage(b64);
      setAiResult(text);
    } catch (e) {
        setAiResult("Failed to extract text.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a text field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // C: Toggle Camera
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        handleToggleCamera();
      }

      // Cmd+Shift+2: Quick Capture
      // Note: On some layouts Shift+2 is @, so we check e.code 'Digit2' as well
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '2' || e.code === 'Digit2')) {
        e.preventDefault();
        handleCapture();
      }

      // Esc: Stop Recording
      if (e.key === 'Escape' && mode === AppMode.RECORDING) {
        handleStopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleCamera, handleCapture, handleStopRecording, mode]);

  return (
    <div className="min-h-screen w-full relative selection:bg-blue-500/30 font-sans overflow-hidden">
      
      {mode === AppMode.IDLE && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-gradient-to-b from-[#0f0f12] to-[#1a1a20]">
            <div className="text-center space-y-6 animate-fade-in">
                <div className="relative inline-block group">
                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity rounded-full" />
                    <div className="relative w-28 h-28 bg-gradient-to-br from-gray-800 to-black rounded-[2rem] mx-auto shadow-2xl border border-gray-700/50 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-4 border-gray-700 flex items-center justify-center bg-gray-900">
                             <div className="w-12 h-12 bg-blue-500 rounded-full shadow-inner" />
                        </div>
                        <div className="absolute top-2 right-4 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">BetaScreenCap</h1>
                    <p className="text-gray-400 text-lg">The ultimate capture tool for the web.</p>
                </div>
                <div className="flex justify-center gap-4 text-xs text-gray-500 font-mono">
                    <span>CMD+SHIFT+2</span>
                    <span>•</span>
                    <span>NO INSTALL</span>
                </div>
                <div className="pt-4 text-sm text-gray-500">
                    <p>Tip: Turn on <strong>Camera</strong> first if you want to record yourself.</p>
                </div>
            </div>
         </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-9xl font-bold text-white animate-pulse drop-shadow-2xl">
                  {countdown}
              </div>
          </div>
      )}

      <Toolbar 
        onCapture={handleCapture}
        onRecord={handleRecord}
        isRecording={mode === AppMode.RECORDING}
        onToggleCamera={handleToggleCamera}
        isCameraOn={isCameraOn}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {isCameraOn && (
         <DraggableCamera 
            stream={cameraStream} 
            videoRef={cameraVideoRef} // Pass shared ref
            onPositionChange={(pos) => { cameraPosRef.current = pos; }} 
         />
      )}

      {mode === AppMode.RECORDING && (
        <RecorderOverlay onStop={handleStopRecording} stream={recordingStream || new MediaStream()} />
      )}

      {mode === AppMode.QUICK_ACCESS && media && (
        <QuickAccess 
          media={media}
          onEdit={() => {
              if (media.type === 'video') setMode(AppMode.VIDEO_PREVIEW);
              else setMode(AppMode.EDITING);
          }}
          onClose={() => { setMedia(null); setMode(AppMode.IDLE); setAiResult(null); }}
          onSave={() => handleSave()}
          onCopy={handleCopy}
          onOCR={handleOCR}
        />
      )}

      {mode === AppMode.EDITING && media?.type === 'image' && (
        <Editor 
          media={media}
          onClose={() => { setMode(AppMode.QUICK_ACCESS); }}
          onSave={handleSave}
          onUpdateMedia={handleUpdateMedia}
        />
      )}

      {mode === AppMode.VIDEO_PREVIEW && media?.type === 'video' && (
        <VideoPreview
          media={media}
          onClose={() => { setMode(AppMode.QUICK_ACCESS); }}
          onSave={() => handleSave()}
        />
      )}

      {(aiResult || isProcessing) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-700/50 max-w-lg w-full overflow-hidden animate-slide-up ring-1 ring-white/10">
                <div className="p-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/50">
                    <div className="flex items-center gap-2 text-purple-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium text-white text-sm">Text Recognition</span>
                    </div>
                    <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-6 min-h-[160px] max-h-[60vh] overflow-y-auto">
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                             <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                             <p className="text-gray-400 text-sm">Analyzing pixels...</p>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm w-full selection:bg-purple-500/30">
                            <p className="whitespace-pre-wrap text-gray-200 leading-relaxed font-mono text-sm">{aiResult}</p>
                        </div>
                    )}
                </div>
                {!isProcessing && (
                     <div className="p-4 bg-gray-900/50 border-t border-gray-700/50 flex justify-end gap-2">
                         <button 
                            onClick={() => setAiResult(null)}
                            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Close
                        </button>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(aiResult || ""); setAiResult(null); }}
                            className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-white/10"
                        >
                            Copy to Clipboard
                        </button>
                     </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
