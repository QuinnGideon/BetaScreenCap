

// Add declaration for experimental ImageCapture API
declare class ImageCapture {
  constructor(track: MediaStreamTrack);
  grabFrame(): Promise<ImageBitmap>;
}

export const captureScreen = async (): Promise<Blob> => {
  let stream: MediaStream | null = null;
  
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" } as any,
      audio: false
    });

    const videoTrack = stream.getVideoTracks()[0];
    
    // Attempt 1: Try ImageCapture API (High fidelity)
    try {
      if ('ImageCapture' in window) {
        const imageCapture = new ImageCapture(videoTrack);
        const bitmap = await imageCapture.grabFrame();
        
        videoTrack.stop(); // Stop immediately

        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        ctx.drawImage(bitmap, 0, 0);
        return await canvasToBlob(canvas);
      }
    } catch (e) {
      console.warn("ImageCapture failed, falling back to video element", e);
    }

    // Attempt 2: Fallback to Video Element (Robust)
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(() => resolve());
      };
    });
    
    // Wait a brief moment for the frame to render cleanly
    await new Promise(r => setTimeout(r, 300));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.drawImage(video, 0, 0);
    
    // Cleanup
    videoTrack.stop();
    video.srcObject = null;
    video.remove();

    return await canvasToBlob(canvas);

  } catch (error) {
    const err = error as Error;
    // Don't log error if user simply cancelled the prompt
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw error;
    }

    console.error("Error capturing screen:", error);
    if (stream) {
      (stream as MediaStream).getTracks().forEach(t => t.stop());
    }
    throw error;
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas to Blob failed"));
    }, 'image/png');
  });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/png;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
