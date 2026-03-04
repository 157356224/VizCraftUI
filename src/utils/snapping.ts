export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number; // x or y value
  start: number; // start of the line (e.g. min y)
  end: number; // end of the line (e.g. max y)
  distances?: Array<{
    value: number;
    x: number;
    y: number;
  }>;
}

interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

// Helper to calculate distance between two ranges (1D)
// Returns 0 if overlapping
function getGap(start1: number, end1: number, start2: number, end2: number): number {
  if (end1 < start2) return start2 - end1; // 1 is before 2
  if (end2 < start1) return start1 - end2; // 2 is before 1
  return 0; // Overlapping
}

export function flattenElements(
  elements: any[], 
  getGlobalPos: (el: any) => {x: number, y: number},
  excludeId: string | null = null
): Rect[] {
  const result: Rect[] = [];
  
  const traverse = (list: any[]) => {
    for (const el of list) {
      if (el.id === excludeId) continue;
      if (!el.visible) continue;
      
      const pos = getGlobalPos(el);
      result.push({
        x: pos.x,
        y: pos.y,
        width: el.width,
        height: el.height,
        id: el.id
      });
      
      if (el.children && el.children.length > 0) {
        traverse(el.children);
      }
    }
  };
  
  traverse(elements);
  return result;
}

export function calculateSnapping(
  activeEl: { x: number, y: number, width: number, height: number },
  otherElements: Rect[],
  threshold: number = 10
): SnapResult {
  let { x, y } = activeEl;
  const guides: SnapGuide[] = [];
  
  // Define snap points for active element
  const activeLeft = x;
  const activeCenter = x + activeEl.width / 2;
  const activeRight = x + activeEl.width;
  
  const activeTop = y;
  const activeMiddle = y + activeEl.height / 2;
  const activeBottom = y + activeEl.height;
  
  let bestSnapX = x;
  let bestSnapY = y;
  let minDiffX = threshold + 1;
  let minDiffY = threshold + 1;
  
  // Store potential guides before filtering
  let bestGuidesX: SnapGuide[] = [];
  let bestGuidesY: SnapGuide[] = [];

  for (const other of otherElements) {
    const otherLeft = other.x;
    const otherCenter = other.x + other.width / 2;
    const otherRight = other.x + other.width;
    
    const otherTop = other.y;
    const otherMiddle = other.y + other.height / 2;
    const otherBottom = other.y + other.height;
    
    // Calculate gaps for display
    const gapX = getGap(activeLeft, activeRight, otherLeft, otherRight);
    const gapY = getGap(activeTop, activeBottom, otherTop, otherBottom);

    // Horizontal Snapping (checking X coordinates)
    const checkX = (activeVal: number, otherVal: number) => {
      const diff = Math.abs(activeVal - otherVal);
      if (diff < minDiffX) {
        minDiffX = diff;
        if (activeVal === activeLeft) bestSnapX = otherVal;
        else if (activeVal === activeCenter) bestSnapX = otherVal - activeEl.width / 2;
        else if (activeVal === activeRight) bestSnapX = otherVal - activeEl.width;
        
        // Guide vertical line
        const startY = Math.min(activeTop, otherTop);
        const endY = Math.max(activeBottom, otherBottom);
        
        // Add distance label if there is a gap
        const distances = [];
        if (gapY > 0) {
           // Position label in the middle of the gap
           const midY = (activeTop < otherTop) ? activeBottom + gapY / 2 : otherBottom + gapY / 2;
           distances.push({ value: Math.round(gapY), x: otherVal, y: midY });
        }

        bestGuidesX = [{
          type: 'vertical',
          position: otherVal,
          start: startY,
          end: endY,
          distances
        }];
      } else if (diff === minDiffX && diff < threshold + 1) {
        // Multiple alignments
        const startY = Math.min(activeTop, otherTop);
        const endY = Math.max(activeBottom, otherBottom);
        const distances = [];
        if (gapY > 0) {
           const midY = (activeTop < otherTop) ? activeBottom + gapY / 2 : otherBottom + gapY / 2;
           distances.push({ value: Math.round(gapY), x: otherVal, y: midY });
        }
        bestGuidesX.push({
          type: 'vertical',
          position: otherVal,
          start: startY,
          end: endY,
          distances
        });
      }
    };

    // Check all X combinations
    checkX(activeLeft, otherLeft);
    checkX(activeLeft, otherCenter);
    checkX(activeLeft, otherRight);
    
    checkX(activeCenter, otherLeft);
    checkX(activeCenter, otherCenter);
    checkX(activeCenter, otherRight);
    
    checkX(activeRight, otherLeft);
    checkX(activeRight, otherCenter);
    checkX(activeRight, otherRight);


    // Vertical Snapping (checking Y coordinates)
    const checkY = (activeVal: number, otherVal: number) => {
      const diff = Math.abs(activeVal - otherVal);
      if (diff < minDiffY) {
        minDiffY = diff;
        if (activeVal === activeTop) bestSnapY = otherVal;
        else if (activeVal === activeMiddle) bestSnapY = otherVal - activeEl.height / 2;
        else if (activeVal === activeBottom) bestSnapY = otherVal - activeEl.height;
        
        const startX = Math.min(activeLeft, otherLeft);
        const endX = Math.max(activeRight, otherRight);
        
        const distances = [];
        if (gapX > 0) {
           const midX = (activeLeft < otherLeft) ? activeRight + gapX / 2 : otherRight + gapX / 2;
           distances.push({ value: Math.round(gapX), x: midX, y: otherVal });
        }

        bestGuidesY = [{
          type: 'horizontal',
          position: otherVal,
          start: startX,
          end: endX,
          distances
        }];
      } else if (diff === minDiffY && diff < threshold + 1) {
        const startX = Math.min(activeLeft, otherLeft);
        const endX = Math.max(activeRight, otherRight);
        const distances = [];
        if (gapX > 0) {
           const midX = (activeLeft < otherLeft) ? activeRight + gapX / 2 : otherRight + gapX / 2;
           distances.push({ value: Math.round(gapX), x: midX, y: otherVal });
        }
        bestGuidesY.push({
          type: 'horizontal',
          position: otherVal,
          start: startX,
          end: endX,
          distances
        });
      }
    };

    // Check all Y combinations
    checkY(activeTop, otherTop);
    checkY(activeTop, otherMiddle);
    checkY(activeTop, otherBottom);
    
    checkY(activeMiddle, otherTop);
    checkY(activeMiddle, otherMiddle);
    checkY(activeMiddle, otherBottom);
    
    checkY(activeBottom, otherTop);
    checkY(activeBottom, otherMiddle);
    checkY(activeBottom, otherBottom);
  }
  
  if (minDiffX <= threshold) {
    x = bestSnapX;
    guides.push(...bestGuidesX);
  }
  if (minDiffY <= threshold) {
    y = bestSnapY;
    guides.push(...bestGuidesY);
  }
  
  return { x, y, guides };
}