export interface EditorElement {
  id: string;
  name: string;
  type: 'frame' | 'rect' | 'text' | 'image' | 'carousel';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
  expanded: boolean;
  children: EditorElement[];
  content?: string;
  imageUrl?: string;
  images?: string[]; // For carousel
  currentIndex?: number;
  interval?: number; // Auto-play interval in ms
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    opacity?: number;
    borderRadius?: string;
    borderTopLeftRadius?: string;
    borderTopRightRadius?: string;
    borderBottomRightRadius?: string;
    borderBottomLeftRadius?: string;
    [key: string]: any;
  };
}

export interface AlignmentLine {
  type: 'vertical' | 'horizontal';
  x?: number; // For vertical lines
  y?: number; // For horizontal lines
  start: number;
  end: number;
}

export interface SnapResult {
  x: number;
  y: number;
  lines: AlignmentLine[];
}
