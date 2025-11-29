import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { 
  ArrowRight, Type, Square, Pen, Crop, Download, X, 
  Copy, Check, Highlighter, CircleDot, Monitor, 
  ZoomIn, ZoomOut, Maximize, Undo, Redo, MousePointer2,
  BoxSelect, Minus, Plus, EyeOff, RotateCw
} from 'lucide-react';
import { CapturedMedia, ToolType, DrawingElement } from '../types';

interface EditorProps {
  media: CapturedMedia;
  onClose: () => void;
  onSave: (blob: Blob) => void;
  onUpdateMedia: (media: CapturedMedia) => void;
}

const BACKGROUND_STYLES = {
    '#ef4444': 'linear-gradient(135deg, #f43f5e, #e11d48)', // Red/Rose
    '#f59e0b': 'linear-gradient(135deg, #fbbf24, #d97706)', // Amber
    '#10b981': 'linear-gradient(135deg, #34d399, #059669)', // Emerald
    '#3b82f6': 'linear-gradient(135deg, #60a5fa, #2563eb)', // Blue
    '#8b5cf6': 'linear-gradient(135deg, #a78bfa, #7c3aed)', // Violet
    '#ffffff': 'linear-gradient(135deg, #f3f4f6, #d1d5db)', // White/Gray
};

// Math Helpers
const getElementBounds = (el: DrawingElement) => {
    if (el.points && (el.type === ToolType.PEN || el.type === ToolType.HIGHLIGHTER)) {
       if (el.points.length === 0) return {x:0, y:0, w:0, h:0};
       const xs = el.points.map(p => p.x);
       const ys = el.points.map(p => p.y);
       const minX = Math.min(...xs);
       const minY = Math.min(...ys);
       return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    }
    if (el.type === ToolType.ARROW) {
       const ex = el.x + (el.width || 0);
       const ey = el.y + (el.height || 0);
       return {
          x: Math.min(el.x, ex),
          y: Math.min(el.y, ey),
          w: Math.abs(el.x - ex),
          h: Math.abs(el.y - ey)
       };
    }
    if (el.type === ToolType.COUNTER) {
        return { x: el.x - 16, y: el.y - 16, w: 32, h: 32 };
    }
    
    // Rect, Text, Blur
    let x = el.x, y = el.y, w = el.width || 0, h = el.height || 0;
    // Normalize negative width/height for bounds calculation
    if (w < 0) { x += w; w = Math.abs(w); }
    if (h < 0) { y += h; h = Math.abs(h); }
    return { x, y, w, h };
};

const rotatePoint = (x: number, y: number, cx: number, cy: number, angle: number) => {
    // Rotates point (x,y) around (cx,cy) by angle radians
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const dx = x - cx;
    const dy = y - cy;
    return {
        x: cx + (dx * c - dy * s),
        y: cy + (dx * s + dy * c)
    };
};

const drawElement = (ctx: CanvasRenderingContext2D, el: DrawingElement, bgImg?: HTMLImageElement, zoom: number = 1) => {
    ctx.save();
    
    // Handle Rotation
    const bounds = getElementBounds(el);
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    
    if (el.rotation) {
        ctx.translate(cx, cy);
        ctx.rotate(el.rotation);
        ctx.translate(-cx, -cy);
    }

    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = el.lineWidth || 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (el.type === ToolType.BLUR) {
        ctx.save();
        ctx.beginPath();
        const bx = el.x;
        const by = el.y;
        const bw = el.width || 0;
        const bh = el.height || 0;
        
        ctx.rect(bx, by, bw, bh);
        ctx.clip();
        
        const bInt = el.blurIntensity || 16;
        ctx.filter = `blur(${bInt}px)`;
        
        // Complex: Draw the image such that it matches the underlying position
        // Since we are in a transformed context, we need to untransform to draw the image at (0,0) absolute
        if (bgImg) {
            ctx.save();
            if (el.rotation) {
                // Reverse the rotation transform to draw image upright in absolute space
                ctx.translate(cx, cy);
                ctx.rotate(-el.rotation);
                ctx.translate(-cx, -cy);
            }
            ctx.drawImage(bgImg, 0, 0);
            ctx.restore();
        }
        
        ctx.restore();
    }
    else if (el.type === ToolType.HIGHLIGHTER && el.points) {
         ctx.globalAlpha = 0.4;
         ctx.lineWidth = 20; 
         if (el.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x, el.points[i].y);
            }
            ctx.stroke();
         }
         ctx.globalAlpha = 1.0;
         ctx.lineWidth = 4;
    }
    else if (el.type === ToolType.RECTANGLE) {
        if (el.borderStyle === 'none') {
            ctx.globalAlpha = 1.0; 
            ctx.fillRect(el.x, el.y, el.width || 0, el.height || 0);
        } else {
            if (el.borderStyle === 'dashed') {
                ctx.setLineDash([12, 8]);
            } else {
                ctx.setLineDash([]);
            }
            ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
            ctx.setLineDash([]); 
        }
    } 
    else if (el.type === ToolType.ARROW) {
        const endX = (el.x + (el.width || 0));
        const endY = (el.y + (el.height || 0));
        const headlen = 20; 
        const dx = endX - el.x;
        const dy = endY - el.y;
        const angle = Math.atan2(dy, dx);
        
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.fill();
    }
    else if (el.type === ToolType.PEN && el.points) {
        if (el.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
    }
    else if (el.type === ToolType.TEXT && el.text) {
        const fs = el.fontSize || 24;
        const lh = fs * 1.25;
        ctx.font = `bold ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = el.color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        const lines = el.text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, el.x, el.y + (i * lh));
        });
        ctx.shadowBlur = 0;
    }
    else if (el.type === ToolType.COUNTER && el.number !== undefined) {
        const size = 32;
        ctx.beginPath();
        ctx.arc(el.x, el.y, size/2, 0, 2 * Math.PI);
        ctx.fillStyle = el.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.number.toString(), el.x, el.y);
        ctx.textAlign = 'start'; 
    }
    
    ctx.restore();
};

export const Editor: React.FC<EditorProps> = ({ media, onClose, onSave, onUpdateMedia }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  
  // History State
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);
  const [historyStep, setHistoryStep] = useState(0);
  const [elements, setElements] = useState<DrawingElement[]>([]); // Current elements to render

  const [selectedTool, setSelectedTool] = useState<ToolType>(ToolType.SELECT);
  const [color, setColor] = useState('#ef4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [cropRect, setCropRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [showBackground, setShowBackground] = useState(false);
  const [backgroundStyle, setBackgroundStyle] = useState<string>(BACKGROUND_STYLES['#8b5cf6']); // Default Violet
  const [textInput, setTextInput] = useState<{x: number, y: number, text: string, color: string} | null>(null);
  const [zoom, setZoom] = useState(1);

  // Tool Specific States
  const [fontSize, setFontSize] = useState(24);
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'none'>('solid');
  const [blurIntensity, setBlurIntensity] = useState(16);

  // Selection & Transform State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{x: number, y: number} | null>(null);

  // Load initial image and reset history
  useEffect(() => {
    setZoom(1);
    setElements([]);
    setHistory([[]]);
    setHistoryStep(0);
    renderCanvas();
    // Auto fit large images
    setTimeout(handleFit, 100);
  }, [media.url]);

  // Window Resize Listener
  useEffect(() => {
    const handleResize = () => {
        handleFit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [media.url, showBackground]);

  // Re-render on state changes
  useEffect(() => {
    renderCanvas();
  }, [elements, currentElement, cropRect, selectedTool, showBackground, backgroundStyle, textInput, selectedId, isRotating, zoom]);

  // Sync tool properties when selection changes
  useEffect(() => {
    if (selectedId) {
        const el = elements.find(e => e.id === selectedId);
        if (el) {
            if (el.type === ToolType.TEXT && el.fontSize) setFontSize(el.fontSize);
            if (el.type === ToolType.RECTANGLE && el.borderStyle) setBorderStyle(el.borderStyle);
            if (el.type === ToolType.BLUR) setBlurIntensity(el.blurIntensity || 16);
            setColor(el.color);
        }
    }
  }, [selectedId, elements]);

  // Focus and Resize text input when it appears or changes
  useLayoutEffect(() => {
    if (textInput && textInputRef.current) {
        textInputRef.current.focus();
        textInputRef.current.style.height = 'auto';
        textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';
        textInputRef.current.style.width = 'auto';
        textInputRef.current.style.width = (textInputRef.current.scrollWidth + 20) + 'px';
    }
  }, [textInput, fontSize]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
        }
        if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId && !textInput) {
            const newElements = elements.filter(el => el.id !== selectedId);
            saveToHistory(newElements);
            setSelectedId(null);
        }
        if (e.key === 'Escape') {
             if (textInput) commitText();
             if (selectedId) setSelectedId(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStep, history, textInput, selectedId, elements]);

  const saveToHistory = (newElements: DrawingElement[]) => {
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(newElements);
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
      setElements(newElements);
  };

  const undo = () => {
      if (historyStep > 0) {
          const prevStep = historyStep - 1;
          setHistoryStep(prevStep);
          setElements(history[prevStep]);
          setSelectedId(null);
      }
  };

  const redo = () => {
      if (historyStep < history.length - 1) {
          const nextStep = historyStep + 1;
          setHistoryStep(nextStep);
          setElements(history[nextStep]);
          setSelectedId(null);
      }
  };

  const updateSelectedProperty = (updates: Partial<DrawingElement>) => {
    if (!selectedId) return;
    const newElements = elements.map(el => {
        if (el.id === selectedId) {
            return { ...el, ...updates };
        }
        return el;
    });
    setElements(newElements);
    saveToHistory(newElements); 
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(128, fontSize + delta));
    setFontSize(newSize);
    if (selectedId) updateSelectedProperty({ fontSize: newSize });
  };

  const handleBlurIntensityChange = (val: number) => {
    const newIntensity = Math.max(0, Math.min(100, val));
    setBlurIntensity(newIntensity);
    if (selectedId) updateSelectedProperty({ blurIntensity: newIntensity });
  };

  const handleBorderStyleChange = (style: 'solid' | 'dashed' | 'none') => {
    setBorderStyle(style);
    if (selectedId) updateSelectedProperty({ borderStyle: style });
  };

  const handleColorChange = (c: string) => {
      if (!selectedId && showBackground) {
          const style = (BACKGROUND_STYLES as any)[c] || c;
          setBackgroundStyle(style);
      } else {
          setColor(c);
          if (textInput) setTextInput(prev => prev ? {...prev, color: c} : null);
          if (selectedId) updateSelectedProperty({ color: c });
      }
  };

  const handleFit = () => {
    if (!containerRef.current || !canvasRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const padding = showBackground ? 60 : 0;
    
    const img = new Image();
    img.src = media.url;
    // If image isn't loaded yet, just retry or wait (useEffect calls this)
    if (img.width === 0) return;

    const contentW = img.width + (padding * 2);
    const contentH = img.height + (padding * 2);
    // Use smaller padding for mobile
    const uiPadding = window.innerWidth < 640 ? 40 : 100;
    
    const scaleX = (container.width - uiPadding) / contentW;
    const scaleY = (container.height - uiPadding) / contentH;
    const fitScale = Math.min(scaleX, scaleY, 1);
    setZoom(fitScale);
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = media.url;
    
    if (!img.complete) {
        img.onload = renderCanvas;
        return;
    }

    const padding = showBackground ? 60 : 0;
    const totalWidth = img.width + (padding * 2);
    const totalHeight = img.height + (padding * 2);

    if (canvas.width !== totalWidth || canvas.height !== totalHeight) {
      canvas.width = totalWidth;
      canvas.height = totalHeight;
    }

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    if (showBackground) {
      if (backgroundStyle.includes('gradient')) {
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          if (backgroundStyle.includes('#f43f5e')) { gradient.addColorStop(0, '#f43f5e'); gradient.addColorStop(1, '#e11d48'); }
          else if (backgroundStyle.includes('#fbbf24')) { gradient.addColorStop(0, '#fbbf24'); gradient.addColorStop(1, '#d97706'); }
          else if (backgroundStyle.includes('#34d399')) { gradient.addColorStop(0, '#34d399'); gradient.addColorStop(1, '#059669'); }
          else if (backgroundStyle.includes('#60a5fa')) { gradient.addColorStop(0, '#60a5fa'); gradient.addColorStop(1, '#2563eb'); }
          else if (backgroundStyle.includes('#a78bfa')) { gradient.addColorStop(0, '#a78bfa'); gradient.addColorStop(1, '#7c3aed'); }
          else if (backgroundStyle.includes('#f3f4f6')) { gradient.addColorStop(0, '#f3f4f6'); gradient.addColorStop(1, '#d1d5db'); }
          else {
               gradient.addColorStop(0, '#8b5cf6'); gradient.addColorStop(1, '#7c3aed');
          }
          ctx.fillStyle = gradient;
      } else {
          ctx.fillStyle = backgroundStyle;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    const imgX = padding;
    const imgY = padding;
    ctx.drawImage(img, imgX, imgY);
    
    // Reset Shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Shift context
    ctx.save();
    ctx.translate(imgX, imgY);

    // Draw Crop Overlay
    if (selectedTool === ToolType.CROP) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, img.width, img.height);
      
      if (cropRect) {
         ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
         ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, cropRect.x, cropRect.y, cropRect.w, cropRect.h);
         
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 2;
         ctx.setLineDash([5, 5]);
         ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
         ctx.setLineDash([]);
         
         ctx.fillStyle = '#fff';
         const hSize = 8 / zoom; // Scale handle size
         ctx.fillRect(cropRect.x - hSize/2, cropRect.y - hSize/2, hSize, hSize);
         ctx.fillRect(cropRect.x + cropRect.w - hSize/2, cropRect.y + cropRect.h - hSize/2, hSize, hSize);
      }
    }

    // Draw Elements
    const allElements = [...elements, ...(currentElement ? [currentElement] : [])];
    allElements.forEach(el => drawElement(ctx, el, img, zoom));

    // Draw Selection Box & Controls
    if (selectedId && !currentElement) {
        const el = elements.find(e => e.id === selectedId);
        if (el) {
            ctx.save();
            const bounds = getElementBounds(el);
            const cx = bounds.x + bounds.w / 2;
            const cy = bounds.y + bounds.h / 2;

            if (el.rotation) {
                ctx.translate(cx, cy);
                ctx.rotate(el.rotation);
                ctx.translate(-cx, -cy);
            }

            const bx = bounds.x, by = bounds.y, bw = bounds.w, bh = bounds.h;
    
            // Draw selection box
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.5 / zoom;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(bx - 5, by - 5, bw + 10, bh + 10);
            
            // Draw corner handles
            ctx.fillStyle = '#3b82f6';
            ctx.setLineDash([]);
            
            // Scaled Handle Size for better Touch/Click targets
            const handleSize = 10 / zoom; 
            const corners = [
                {x: bx - 5, y: by - 5},
                {x: bx + bw + 5, y: by - 5},
                {x: bx + bw + 5, y: by + bh + 5},
                {x: bx - 5, y: by + bh + 5}
            ];
            corners.forEach(c => ctx.fillRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize));

            // Draw Rotation Handle
            const rotHandleY = by - (30 / zoom);
            ctx.beginPath();
            ctx.moveTo(cx, by - 5);
            ctx.lineTo(cx, rotHandleY);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.5 / zoom;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, rotHandleY, 6 / zoom, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
    }

    ctx.restore();
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    } else {
        return { x: 0, y: 0 };
    }

    let rawX = (clientX - rect.left) * scaleX;
    let rawY = (clientY - rect.top) * scaleY;

    const padding = showBackground ? 60 : 0;
    return {
      x: rawX - padding,
      y: rawY - padding
    };
  };

  // Helper for point to segment distance
  const distToSegment = (p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}) => {
    const l2 = Math.pow(Math.sqrt(Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2)), 2);
    if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
  }

  const hitTest = (x: number, y: number) => {
      // Scale threshold by zoom for consistent physical hit area
      // e.g. at 0.5x zoom, we need 2x canvas pixels to equal same screen pixels
      const threshold = 15 / zoom; 

      // Iterate in reverse (top-most first)
      for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];
          const bounds = getElementBounds(el);
          
          // Check if point is inside oriented bounding box
          let localX = x;
          let localY = y;
          
          if (el.rotation) {
              const cx = bounds.x + bounds.w / 2;
              const cy = bounds.y + bounds.h / 2;
              const rotated = rotatePoint(x, y, cx, cy, -el.rotation);
              localX = rotated.x;
              localY = rotated.y;
          }

          if (el.type === ToolType.PEN || el.type === ToolType.HIGHLIGHTER) {
             if (el.points) {
                 for (let j = 0; j < el.points.length - 1; j++) {
                     if (distToSegment({x: localX, y: localY}, el.points[j], el.points[j+1]) < threshold) return el;
                 }
             }
          } else if (el.type === ToolType.ARROW) {
              const start = {x: el.x, y: el.y};
              const end = {x: el.x + (el.width || 0), y: el.y + (el.height || 0)};
              if (distToSegment({x: localX, y: localY}, start, end) < threshold) return el;
          } else {
              // Rect, Text, Counter, Blur
              let bx = el.x, by = el.y, bw = el.width || 0, bh = el.height || 0;
              if (bw < 0) { bx += bw; bw = Math.abs(bw); }
              if (bh < 0) { by += bh; bh = Math.abs(bh); }
              
              if (el.type === ToolType.COUNTER) {
                  bx -= 16; by -= 16; bw = 32; bh = 32;
              }

              if (localX >= bx && localX <= bx + bw && localY >= by && localY <= by + bh) return el;
          }
      }
      return null;
  }

  const isOverRotationHandle = (x: number, y: number, el: DrawingElement) => {
      const bounds = getElementBounds(el);
      const cx = bounds.x + bounds.w / 2;
      const cy = bounds.y + bounds.h / 2;
      
      // Rotate mouse point into local space
      const local = el.rotation ? rotatePoint(x, y, cx, cy, -el.rotation) : {x, y};
      
      const handleX = cx;
      const handleY = bounds.y - (30 / zoom); // Matches render offset
      
      const dist = Math.sqrt(Math.pow(local.x - handleX, 2) + Math.pow(local.y - handleY, 2));
      return dist < (20 / zoom); // Generous hit radius scaled by zoom
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); 
    
    if (textInput) {
        commitText();
        return; 
    }
    
    const { x, y } = getPos(e);

    // Select Tool Logic
    if (selectedTool === ToolType.SELECT) {
        // Check rotation handle first if something is selected
        if (selectedId) {
            const el = elements.find(e => e.id === selectedId);
            if (el && isOverRotationHandle(x, y, el)) {
                setIsRotating(true);
                setLastMousePos({x, y}); // Only needed for general ref, rotation uses absolute calc
                return;
            }
        }

        const hit = hitTest(x, y);
        if (hit) {
            setSelectedId(hit.id);
            setIsDragging(true);
            setLastMousePos({x, y});
        } else {
            setSelectedId(null);
        }
        return;
    }

    setIsDrawing(true);
    setSelectedId(null);

    if (selectedTool === ToolType.TEXT) {
      setTextInput({ x, y, text: "", color });
      setIsDrawing(false);
      return;
    }

    if (selectedTool === ToolType.COUNTER) {
      const counters = elements.filter(e => e.type === ToolType.COUNTER);
      const nextNum = (counters.length > 0 ? Math.max(...counters.map(c => c.number || 0)) : 0) + 1;
      const newEl: DrawingElement = {
        id: Date.now().toString(),
        type: ToolType.COUNTER,
        x, y,
        color,
        number: nextNum
      };
      saveToHistory([...elements, newEl]);
      setIsDrawing(false);
      return;
    }

    if (selectedTool === ToolType.CROP) {
      setCropRect({ x, y, w: 0, h: 0 });
      return;
    }

    setCurrentElement({
      id: Date.now().toString(),
      type: selectedTool,
      x, y,
      width: 0,
      height: 0,
      color: selectedTool === ToolType.BLUR ? 'transparent' : color,
      points: (selectedTool === ToolType.PEN || selectedTool === ToolType.HIGHLIGHTER) ? [{x, y}] : undefined,
      lineWidth: selectedTool === ToolType.HIGHLIGHTER ? 20 : 4,
      borderStyle: selectedTool === ToolType.RECTANGLE ? borderStyle : undefined,
      blurIntensity: selectedTool === ToolType.BLUR ? blurIntensity : undefined,
    });
  };

  const commitText = () => {
    if (!textInput || !textInput.text.trim()) {
        setTextInput(null);
        return;
    }
    
    const ctx = canvasRef.current?.getContext('2d');
    let width = 0;
    let height = 0;
    if (ctx) {
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
        const lines = textInput.text.split('\n');
        const lh = fontSize * 1.25;
        height = lines.length * lh;
        width = Math.max(...lines.map(line => ctx.measureText(line).width));
    }

    const newEl: DrawingElement = {
        id: Date.now().toString(),
        type: ToolType.TEXT,
        x: textInput.x,
        y: textInput.y,
        width: width,
        height: height,
        color: textInput.color,
        text: textInput.text,
        fontSize: fontSize
    };
    saveToHistory([...elements, newEl]);
    setTextInput(null);
    setSelectedId(newEl.id);
    setSelectedTool(ToolType.SELECT);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);

    // Cursor update only for mouse
    if (!('touches' in e) && selectedTool === ToolType.SELECT) {
         if (isRotating && selectedId) {
             // ... rotation logic handled below, cursor set by isRotating state logic implicitly
         } else {
             const hit = hitTest(x, y);
             let cursor = 'default';
             if (hit || isDragging) cursor = 'move';
             
             if (selectedId) {
                 const el = elements.find(e => e.id === selectedId);
                 if (el && isOverRotationHandle(x, y, el)) cursor = 'grabbing';
             }
             if (canvasRef.current) canvasRef.current.style.cursor = cursor;
         }
    }

    if (selectedTool === ToolType.SELECT) {
         if (isRotating && selectedId) {
             const el = elements.find(e => e.id === selectedId);
             if (el) {
                const bounds = getElementBounds(el);
                const cx = bounds.x + bounds.w / 2;
                const cy = bounds.y + bounds.h / 2;
                
                // Calculate angle from center to mouse
                // -PI/2 is up (where the handle is)
                const angle = Math.atan2(y - cy, x - cx);
                const rotation = angle + Math.PI / 2;
                
                // Update element
                const newElements = elements.map(e => e.id === selectedId ? { ...e, rotation } : e);
                setElements(newElements);
             }
             return;
         }

         if (isDragging && selectedId && lastMousePos) {
             const dx = x - lastMousePos.x;
             const dy = y - lastMousePos.y;
             
             const newElements = elements.map(el => {
                 if (el.id === selectedId) {
                     const newEl = { ...el };
                     if (newEl.type === ToolType.PEN || newEl.type === ToolType.HIGHLIGHTER) {
                         if (newEl.points) {
                             newEl.points = newEl.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                         }
                     } else {
                         newEl.x += dx;
                         newEl.y += dy;
                     }
                     return newEl;
                 }
                 return el;
             });
             setElements(newElements);
             setLastMousePos({x, y});
         }
         return;
    }

    if (!isDrawing) return;

    if (selectedTool === ToolType.CROP && cropRect) {
      setCropRect(prev => ({ ...prev!, w: x - prev!.x, h: y - prev!.y }));
      return;
    }

    if (!currentElement) return;

    if (selectedTool === ToolType.PEN || selectedTool === ToolType.HIGHLIGHTER) {
      setCurrentElement(prev => ({
        ...prev!,
        points: [...(prev!.points || []), {x, y}]
      }));
    } else {
      setCurrentElement(prev => ({
        ...prev!,
        width: x - prev!.x,
        height: y - prev!.y
      }));
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setIsRotating(false);
    
    if (selectedTool === ToolType.SELECT) {
        if (isDragging) {
            setIsDragging(false);
            setLastMousePos(null);
            saveToHistory(elements);
        }
        if (isRotating) {
            saveToHistory(elements);
        }
        return;
    }
    
    if (selectedTool === ToolType.CROP) return;

    if (currentElement) {
      saveToHistory([...elements, currentElement]);
      setCurrentElement(null);
    }
  };

  const applyCrop = () => {
    if (!cropRect || !canvasRef.current) return;
    
    const w = Math.abs(cropRect.w);
    const h = Math.abs(cropRect.h);
    const x = cropRect.w > 0 ? cropRect.x : cropRect.x + cropRect.w;
    const y = cropRect.h > 0 ? cropRect.y : cropRect.y + cropRect.h;

    if (w < 1 || h < 1) {
        setCropRect(null);
        return;
    }
    
    const img = new Image();
    img.src = media.url;
    img.onload = () => {
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = img.width;
        fullCanvas.height = img.height;
        const ctx = fullCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        // Bake elements
        elements.forEach(el => drawElement(ctx, el, img));

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.floor(w);
        cropCanvas.height = Math.floor(h);
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) return;

        cropCtx.drawImage(
            fullCanvas, 
            Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h), 
            0, 0, Math.floor(w), Math.floor(h) 
        );
        
        cropCanvas.toBlob(blob => {
            if (blob) {
                const newUrl = URL.createObjectURL(blob);
                const newMedia = { ...media, url: newUrl, blob };
                setElements([]);
                setHistory([[]]);
                setHistoryStep(0);
                setCropRect(null);
                setSelectedTool(ToolType.SELECT);
                setTextInput(null);
                setZoom(1); 
                onUpdateMedia(newMedia);
            }
        }, 'image/png');
    }
  };

  const handleSave = () => {
    if (textInput) {
        commitText();
        setTimeout(() => {
             canvasRef.current?.toBlob((blob) => {
                if (blob) onSave(blob);
            }, 'image/png');
        }, 50);
        return;
    }

    const tempSelected = selectedId;
    setSelectedId(null);
    
    setTimeout(() => {
        canvasRef.current?.toBlob((blob) => {
          if (blob) onSave(blob);
          setSelectedId(tempSelected);
        }, 'image/png');
    }, 0);
  };

  const handleCopy = () => {
     if (textInput) commitText();
     const tempSelected = selectedId;
     setSelectedId(null);

     setTimeout(() => {
        canvasRef.current?.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
                ]).then(() => alert("Copied to clipboard!"));
                setSelectedId(tempSelected);
            }
        });
     }, 0);
  };

  const getWrapperStyle = () => {
      if (!canvasRef.current) return {};
      const width = canvasRef.current.width * zoom;
      const height = canvasRef.current.height * zoom;
      return { width, height };
  };

  const activeToolType = selectedId 
     ? elements.find(e => e.id === selectedId)?.type || selectedTool 
     : selectedTool;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f12]/95 backdrop-blur-sm flex flex-col animate-fade-in">
      {/* Mac-like Header - Scrollable for small screens */}
      <div className="h-14 bg-[#16161a] border-b border-gray-800 shrink-0 z-10 overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-between min-w-max px-4 md:px-6 h-full">
            <div className="flex items-center gap-4">
                <button onClick={onClose} className="group p-2 rounded-full hover:bg-gray-800 transition-colors">
                    <X className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </button>
                <div className="h-6 w-px bg-gray-700" />
                
                <div className="flex items-center gap-1">
                    <button 
                        onClick={undo} 
                        disabled={historyStep === 0}
                        className={`p-2 rounded-lg transition-colors ${historyStep === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    >
                        <Undo className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={redo} 
                        disabled={historyStep === history.length - 1}
                        className={`p-2 rounded-lg transition-colors ${historyStep === history.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    >
                        <Redo className="w-4 h-4" />
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-700" />

                <div className="flex items-center gap-1 md:gap-2">
                    <ToolButton icon={MousePointer2} label="Select" active={selectedTool === ToolType.SELECT} onClick={() => setSelectedTool(ToolType.SELECT)} />
                    <div className="h-4 w-px bg-gray-700 mx-1" />
                    <ToolButton icon={ArrowRight} label="Arrow" active={selectedTool === ToolType.ARROW} onClick={() => setSelectedTool(ToolType.ARROW)} />
                    <ToolButton icon={Square} label="Rect" active={selectedTool === ToolType.RECTANGLE} onClick={() => setSelectedTool(ToolType.RECTANGLE)} />
                    <ToolButton icon={Type} label="Text" active={selectedTool === ToolType.TEXT} onClick={() => setSelectedTool(ToolType.TEXT)} />
                    <ToolButton icon={Pen} label="Draw" active={selectedTool === ToolType.PEN} onClick={() => setSelectedTool(ToolType.PEN)} />
                    <ToolButton icon={Highlighter} label="Highlight" active={selectedTool === ToolType.HIGHLIGHTER} onClick={() => setSelectedTool(ToolType.HIGHLIGHTER)} />
                    <ToolButton icon={CircleDot} label="Steps" active={selectedTool === ToolType.COUNTER} onClick={() => setSelectedTool(ToolType.COUNTER)} />
                    <ToolButton icon={EyeOff} label="Blur" active={selectedTool === ToolType.BLUR} onClick={() => setSelectedTool(ToolType.BLUR)} />
                    <div className="h-4 w-px bg-gray-700 mx-1" />
                    <ToolButton icon={Crop} label="Crop" active={selectedTool === ToolType.CROP} onClick={() => setSelectedTool(ToolType.CROP)} />
                </div>

                {/* Contextual Tool Options */}
                {(activeToolType === ToolType.RECTANGLE) && (
                    <>
                    <div className="h-6 w-px bg-gray-700 mx-1" />
                    <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
                        <button onClick={() => handleBorderStyleChange('solid')} className={`p-1.5 rounded transition-colors ${borderStyle === 'solid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`} title="Solid Border">
                            <Square className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleBorderStyleChange('dashed')} className={`p-1.5 rounded transition-colors ${borderStyle === 'dashed' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`} title="Dashed Border">
                            <BoxSelect className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleBorderStyleChange('none')} className={`p-1.5 rounded transition-colors ${borderStyle === 'none' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`} title="Filled (No Border)">
                            <Square fill="currentColor" className="w-4 h-4" />
                        </button>
                    </div>
                    </>
                )}

                {(activeToolType === ToolType.TEXT) && (
                    <>
                    <div className="h-6 w-px bg-gray-700 mx-1" />
                    <div className="flex items-center gap-2 bg-gray-900 p-1 px-2 rounded-lg border border-gray-800">
                        <button onClick={() => handleFontSizeChange(-4)} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                            <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono w-6 text-center text-gray-300">{fontSize}</span>
                        <button onClick={() => handleFontSizeChange(4)} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    </>
                )}

                {(activeToolType === ToolType.BLUR) && (
                    <>
                    <div className="h-6 w-px bg-gray-700 mx-1" />
                    <div className="flex items-center gap-2 bg-gray-900 p-1 px-3 rounded-lg border border-gray-800">
                        <span className="text-[10px] uppercase font-bold text-gray-500 mr-1">Intensity</span>
                        <input 
                                type="range" 
                                min="2" 
                                max="64" 
                                step="2"
                                value={blurIntensity} 
                                onChange={(e) => handleBlurIntensityChange(parseInt(e.target.value))}
                                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs font-mono w-6 text-right text-gray-300">{blurIntensity}</span>
                    </div>
                    </>
                )}

            </div>
            
            <div className="flex items-center gap-4 pl-4">
                <button 
                    onClick={() => setShowBackground(!showBackground)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showBackground ? 'bg-indigo-600 text-white shadow-indigo-500/20 shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                    <Monitor className="w-4 h-4" />
                    <span>Wallpaper</span>
                </button>

                <div className="flex gap-1.5 p-1 bg-gray-900 rounded-lg border border-gray-800">
                    {[ '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff' ].map(c => (
                        <button 
                            key={c}
                            onClick={() => handleColorChange(c)}
                            className={`w-5 h-5 rounded-full border-2 transition-transform ${
                                (selectedTool === ToolType.BLUR) ? 'opacity-30 cursor-not-allowed' :
                                (color === c && !(!selectedId && showBackground)) ? 'border-white scale-110' : 
                                'border-transparent hover:scale-110'
                            }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <div className="h-6 w-px bg-gray-700" />

                <div className="flex items-center gap-2">
                    {selectedTool === ToolType.CROP && cropRect && (
                        <button onClick={applyCrop} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 animate-pulse">
                            <Check className="w-4 h-4" /> Apply
                        </button>
                    )}
                    <button onClick={handleCopy} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors" title="Copy to Clipboard">
                        <Copy className="w-5 h-5" />
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20 transition-all hover:shadow-blue-500/30">
                        <Download className="w-4 h-4" />
                        Save
                    </button>
                </div>
            </div>
          </div>
      </div>

      {/* Canvas Area with Robust Wrapper */}
      <div 
        className="flex-1 overflow-auto p-4 md:p-12 flex relative bg-[#0f0f12] touch-none" 
        ref={containerRef} 
        onClick={(e) => {
           if (e.target === containerRef.current) {
               if (textInput) commitText();
               if (selectedId) setSelectedId(null);
           }
        }}
      >
         <div 
            className="relative m-auto shadow-2xl transition-all duration-75 shrink-0"
            style={getWrapperStyle()}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
         >
             <canvas 
                ref={canvasRef}
                className={`block w-full h-full bg-transparent rounded-sm ${
                    selectedTool === ToolType.TEXT ? 'cursor-text' : 
                    selectedTool === ToolType.SELECT ? 'cursor-default' : 'cursor-crosshair'
                } ${textInput ? 'pointer-events-none' : ''}`}
             />
             
             {textInput && (
                <textarea
                    ref={textInputRef}
                    autoFocus
                    value={textInput.text}
                    onChange={e => setTextInput({...textInput, text: e.target.value})}
                    onMouseDown={(e) => e.stopPropagation()} 
                    onMouseUp={(e) => e.stopPropagation()}   
                    onClick={(e) => e.stopPropagation()}     
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            commitText();
                            e.preventDefault();
                        }
                        if (e.key === 'Escape') {
                            commitText();
                            e.preventDefault();
                        }
                    }}
                    className="absolute bg-black/40 backdrop-blur-[2px] border border-blue-500/50 outline-none resize-none overflow-hidden p-0 m-0 rounded shadow-lg min-w-[50px] placeholder:text-white/50"
                    style={{
                        top: ((textInput.x + (showBackground ? 60 : 0)) * zoom) + 'px',
                        left: ((textInput.y + (showBackground ? 60 : 0)) * zoom) + 'px',
                        color: textInput.color,
                        fontSize: fontSize + 'px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        fontWeight: 'bold',
                        lineHeight: (fontSize * 1.25) + 'px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'auto',
                        zIndex: 100
                    }}
                    placeholder="Type..."
                />
             )}
         </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-full px-4 py-2 flex items-center gap-3 shadow-xl z-20 max-w-[90vw] overflow-hidden">
            <button 
                onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} 
                className="p-1 hover:bg-gray-700 rounded-full text-gray-300 transition-colors"
                title="Zoom Out"
            >
                <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-gray-400 w-12 text-center select-none">
                {Math.round(zoom * 100)}%
            </span>
            <button 
                onClick={() => setZoom(z => Math.min(5, z + 0.1))} 
                className="p-1 hover:bg-gray-700 rounded-full text-gray-300 transition-colors"
                title="Zoom In"
            >
                <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1" />
            <button 
                onClick={handleFit} 
                className="p-1 hover:bg-gray-700 rounded-full text-gray-300 transition-colors flex items-center gap-1.5 px-2"
                title="Fit to Screen"
            >
                <Maximize className="w-3 h-3" />
                <span className="text-xs font-medium">Fit</span>
            </button>
      </div>
    </div>
  );
};

const ToolButton: React.FC<{ icon: any, label: string, active: boolean, onClick: () => void }> = ({ icon: Icon, label, active, onClick }) => (
    <div className="relative group flex flex-col items-center">
        <button 
            onClick={onClick}
            className={`p-2 rounded-lg transition-all ${active ? 'bg-gray-700 text-white shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
        >
            <Icon className="w-5 h-5" />
        </button>
        <span className="hidden md:block absolute -bottom-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-800 z-50">
            {label}
        </span>
    </div>
);