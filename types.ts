
export enum AppMode {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  QUICK_ACCESS = 'QUICK_ACCESS',
  EDITING = 'EDITING',
  VIDEO_PREVIEW = 'VIDEO_PREVIEW',
}

export enum ToolType {
  SELECT = 'SELECT',
  RECTANGLE = 'RECTANGLE',
  ARROW = 'ARROW',
  TEXT = 'TEXT',
  PEN = 'PEN',
  HIGHLIGHTER = 'HIGHLIGHTER',
  COUNTER = 'COUNTER',
  BLUR = 'BLUR',
  CROP = 'CROP', // Logical tool, not drawing
}

export interface CapturedMedia {
  type: 'image' | 'video';
  url: string; // Blob URL
  blob: Blob;
  width?: number;
  height?: number;
}

export interface DrawingElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: {x: number, y: number}[]; // For Pen/Highlighter
  color: string;
  text?: string;
  number?: number; // For Counter
  lineWidth?: number;
  // New properties
  borderStyle?: 'solid' | 'dashed' | 'none'; // 'none' implies filled
  borderRadius?: number;
  fontSize?: number;
  blurIntensity?: number;
  rotation?: number; // Radians
}
