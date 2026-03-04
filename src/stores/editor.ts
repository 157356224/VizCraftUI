import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface EditorElement {
  id: string;
  name: string;
  type: 'frame' | 'rect' | 'text' | 'image';
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
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    [key: string]: any;
  };
}

export const useEditorStore = defineStore('editor', () => {
  // Canvas State
  const scale = ref(1);
  const offset = ref({ x: 0, y: 0 });
  const isPanning = ref(false);

  // Tools
  const currentTool = ref('move'); // move, region, shape, create
  const currentSubTool = ref('move'); // specific tool like 'rect', 'pen'

  // Elements (Initially empty)
  const elements = ref<EditorElement[]>([]);

  const selectedElementIds = ref<string[]>([]);
  const hoveredElementId = ref<string | null>(null);
  const isResizing = ref(false); // Flag to prevent dragging during resize
  const mouseDownOnElement = ref(false); // Track if mouse was pressed on an element

  // History State
  const history = ref<string[]>([]);
  const historyIndex = ref(-1);
  let isHistoryPaused = false; // Flag to prevent recording during internal updates if needed

  // Initialize history
  function initHistory() {
    if (history.value.length === 0) {
      recordState();
    }
  }

  function recordState() {
    if (isHistoryPaused) return;
    
    // Remove future states if we are in the middle of history
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }
    
    // Push new state
    const state = JSON.stringify(elements.value);
    
    // Avoid duplicate states (optimization)
    if (history.value.length > 0 && history.value[history.value.length - 1] === state) {
      return;
    }
    
    history.value.push(state);
    historyIndex.value = history.value.length - 1;
    
    // Limit history size (optional, e.g. 50 steps)
    if (history.value.length > 50) {
      history.value.shift();
      historyIndex.value--;
    }
  }

  function undo() {
    if (historyIndex.value > 0) {
      historyIndex.value--;
      const state = history.value[historyIndex.value];
      if (state) {
        isHistoryPaused = true;
        elements.value = JSON.parse(state);
        selectedElementIds.value = []; // Clear selection on undo to avoid ghost selections
        isHistoryPaused = false;
      }
    }
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++;
      const state = history.value[historyIndex.value];
      if (state) {
        isHistoryPaused = true;
        elements.value = JSON.parse(state);
        selectedElementIds.value = [];
        isHistoryPaused = false;
      }
    }
  }

  // Actions
  function setTool(tool: string, subTool: string) {
    currentTool.value = tool;
    currentSubTool.value = subTool;
  }

  function addElement(element: EditorElement, parentId?: string) {
    if (parentId) {
      const parent = findElement(elements.value, parentId);
      if (parent) {
        parent.children.push(element);
      }
    } else {
      elements.value.push(element);
    }
    recordState(); // Record after adding
  }

  function findElement(list: EditorElement[], id: string): EditorElement | undefined {
    for (const el of list) {
      if (el.id === id) return el;
      if (el.children.length > 0) {
        const found = findElement(el.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }
  
  // Find element and its parent array
  function findElementAndParent(list: EditorElement[], id: string): { element: EditorElement, parent: EditorElement[] } | undefined {
    for (const el of list) {
      if (el.id === id) {
        return { element: el, parent: list };
      }
      if (el.children.length > 0) {
        const found = findElementAndParent(el.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  function removeElement(id: string) {
    const result = findElementAndParent(elements.value, id);
    if (result) {
      const { element, parent } = result;
      const index = parent.indexOf(element);
      if (index > -1) {
        parent.splice(index, 1);
        // Also remove from selection if selected
        selectedElementIds.value = selectedElementIds.value.filter(sid => sid !== id);
        recordState();
      }
    }
  }

  function toggleExpand(id: string) {
    const el = findElement(elements.value, id);
    if (el) {
      el.expanded = !el.expanded;
    }
  }
  
  function toggleLock(id: string) {
    const el = findElement(elements.value, id);
    if (el) {
      el.locked = !el.locked;
    }
  }
  
  function toggleVisible(id: string) {
    const el = findElement(elements.value, id);
    if (el) {
      el.visible = !el.visible;
    }
  }

  function selectElement(id: string, multi = false) {
    if (multi) {
      if (selectedElementIds.value.includes(id)) {
        selectedElementIds.value = selectedElementIds.value.filter(i => i !== id);
      } else {
        selectedElementIds.value.push(id);
      }
    } else {
      selectedElementIds.value = [id];
    }
  }
  
  function moveElement(dragId: string, targetId: string | null, position: 'before' | 'after' | 'inside') {
    const dragResult = findElementAndParent(elements.value, dragId);
    if (!dragResult) return;
    
    const { element: dragElement, parent: oldParent } = dragResult;
    
    // Remove from old location
    const oldIndex = oldParent.indexOf(dragElement);
    oldParent.splice(oldIndex, 1);
    
    if (targetId === null) {
      // Move to root
      elements.value.push(dragElement);
      recordState();
      return;
    }
    
    const targetResult = findElementAndParent(elements.value, targetId);
    if (!targetResult) {
      // Fallback: push back to old parent if target not found
      oldParent.splice(oldIndex, 0, dragElement);
      return;
    }
    
    const { element: targetElement, parent: targetParent } = targetResult;
    
    if (position === 'inside') {
      // Check if moving to a different parent
      const isDifferentParent = oldParent !== targetElement.children;
      
      if (isDifferentParent) {
        // Center the element in the target frame
        dragElement.x = (targetElement.width - dragElement.width) / 2;
        dragElement.y = (targetElement.height - dragElement.height) / 2;
      }
      
      // Add to target's children
      targetElement.children.push(dragElement);
      targetElement.expanded = true; // Auto expand
    } else if (position === 'before') {
      const targetIndex = targetParent.indexOf(targetElement);
      targetParent.splice(targetIndex, 0, dragElement);
    } else if (position === 'after') {
      const targetIndex = targetParent.indexOf(targetElement);
      targetParent.splice(targetIndex + 1, 0, dragElement);
    }
    recordState();
  }

  function updateElement(id: string, updates: Partial<EditorElement>) {
    const el = findElement(elements.value, id);
    if (el) {
      Object.assign(el, updates);
      recordState();
    }
  }
  
  function updateElementStyle(id: string, styleUpdates: Record<string, any>) {
    const el = findElement(elements.value, id);
    if (el) {
      el.style = { ...el.style, ...styleUpdates };
      recordState();
    }
  }

  function reparentElement(dragId: string, newParentId: string | null) {
    const dragResult = findElementAndParent(elements.value, dragId);
    if (!dragResult) return;
    
    const { element: dragElement, parent: oldParent } = dragResult;
    
    // Find new parent BEFORE removing element
    let newParent: EditorElement | null = null;
    let isDifferentParent = false;
    
    if (newParentId !== null) {
      newParent = findElement(elements.value, newParentId) || null;
      if (newParent) {
        // Check if moving to a different parent
        isDifferentParent = oldParent !== newParent.children;
      }
    } else {
      // Moving to root
      isDifferentParent = oldParent !== elements.value;
    }
    
    // Calculate global coordinates of dragElement BEFORE moving
    const dragGlobal = getGlobalPosition(dragElement);
    
    // Remove from old parent and remember the index
    const oldIndex = oldParent.indexOf(dragElement);
    oldParent.splice(oldIndex, 1);
    
    if (newParentId === null) {
      // Moving to root
      dragElement.x = dragGlobal.x;
      dragElement.y = dragGlobal.y;
      
      // Insert at old index if moving within root, otherwise append
      if (oldParent === elements.value && oldIndex < elements.value.length) {
        elements.value.splice(oldIndex, 0, dragElement);
      } else {
        elements.value.push(dragElement);
      }
    } else {
      if (newParent) {
        if (isDifferentParent) {
          // Center the element in the new parent frame
          // Frame center point: (newParent.width / 2, newParent.height / 2)
          // Element center point should be at: (dragElement.x + dragElement.width / 2, dragElement.y + dragElement.height / 2)
          // So: dragElement.x + dragElement.width / 2 = newParent.width / 2
          // Therefore: dragElement.x = newParent.width / 2 - dragElement.width / 2
          dragElement.x = (newParent.width - dragElement.width) / 2;
          dragElement.y = (newParent.height - dragElement.height) / 2;
          
          console.log('Centering element:', {
            elementSize: { w: dragElement.width, h: dragElement.height },
            parentSize: { w: newParent.width, h: newParent.height },
            newPosition: { x: dragElement.x, y: dragElement.y }
          });
        } else {
          // Same parent - maintain position
          // Calculate new parent's global coordinates
          const newParentGlobal = getGlobalPosition(newParent);
          
          // New local = Global - NewParentGlobal
          dragElement.x = dragGlobal.x - newParentGlobal.x;
          dragElement.y = dragGlobal.y - newParentGlobal.y;
        }
        
        // Insert at old index if moving within same parent, otherwise append
        if (oldParent === newParent.children && oldIndex < newParent.children.length) {
          newParent.children.splice(oldIndex, 0, dragElement);
        } else {
          newParent.children.push(dragElement);
        }
        newParent.expanded = true;
      } else {
        // Fallback to root
        dragElement.x = dragGlobal.x;
        dragElement.y = dragGlobal.y;
        elements.value.push(dragElement);
      }
    }
    recordState();
  }

  function getGlobalPosition(element: EditorElement): { x: number, y: number } {
    // Find path from root to element
    const path = findPathToElement(elements.value, element.id);
    let x = 0;
    let y = 0;
    
    if (path) {
      for (const el of path) {
        x += el.x;
        y += el.y;
      }
    } else {
       // Should not happen if element is in store
       x = element.x;
       y = element.y;
    }
    
    return { x, y };
  }

  function findPathToElement(list: EditorElement[], id: string): EditorElement[] | null {
    for (const el of list) {
      if (el.id === id) {
        return [el];
      }
      if (el.children.length > 0) {
        const subPath = findPathToElement(el.children, id);
        if (subPath) {
          return [el, ...subPath];
        }
      }
    }
    return null;
  }

  function exportToUVUE(element: EditorElement): string {
    if (element.type !== 'frame') {
      return ''; // Only frames can be exported as pages
    }

    const rootWidth = element.width; // Capture root frame width for rpx conversion
    const rootHeight = element.height; // Capture root frame height for percentage conversion
    
    let template = `<template>\n  <view class="page-${element.name.replace(/\s+/g, '-')}">\n`;
    
    // Recursive function to generate template
    function generateTemplate(el: EditorElement, indent: string, parentWidth: number, parentHeight: number): string {
      let code = '';
      const styleString = generateStyleString(el, rootWidth, parentWidth, parentHeight);
      
      if (el.type === 'text') {
        code += `${indent}<text class="element-${el.id}" style="${styleString}">${el.content}</text>\n`;
      } else if (el.type === 'rect' || el.type === 'frame') { // Treat rect and nested frames as views
        code += `${indent}<view class="element-${el.id}" style="${styleString}">\n`;
        if (el.children) {
          el.children.forEach(child => {
            code += generateTemplate(child, indent + '  ', el.width, el.height);
          });
        }
        code += `${indent}</view>\n`;
      } else {
        // Fallback for other shapes as views for now
        code += `${indent}<view class="element-${el.id}" style="${styleString}"></view>\n`;
      }
      return code;
    }

    if (element.children) {
      element.children.forEach(child => {
        template += generateTemplate(child, '    ', rootWidth, rootHeight);
      });
    }

    template += `  </view>\n</template>\n\n`;
    
    // Script section
    template += `<script setup>\n  // Logic here\n</script>\n\n`;

    // Style section
    template += `<style>\n`;
    // Root page usually fills screen, so we might want to keep it 100% or use rpx width if fixed?
    // Usually page root is flex or block.
    template += `.page-${element.name.replace(/\s+/g, '-')} {\n  width: 100%;\n  min-height: 100vh;\n  position: relative;\n  background-color: ${element.style.fill || '#ffffff'};\n}\n`;
    template += `</style>`;

    return template;
  }

  function generateStyleString(el: EditorElement, rootWidth: number, parentWidth: number, parentHeight: number): string {
    // Helper to convert px to rpx
    const toRpx = (px: number) => {
      if (px === 0) return '0';
      const rpx = (px / rootWidth) * 750;
      return `${rpx.toFixed(2)}rpx`;
    };

    // Helper to convert px to percentage
    const toPercent = (px: number, parentSize: number) => {
      if (px === 0) return '0';
      if (parentSize === 0) return '0';
      const percent = (px / parentSize) * 100;
      return `${percent.toFixed(2)}%`;
    };

    // Helper to convert px string (e.g. "10px") to rpx
    const pxStrToRpx = (str: string | undefined): string | undefined => {
      if (!str) return undefined;
      const match = str.match(/^(-?[\d.]+)px$/);
      if (match && match[1]) {
        return toRpx(parseFloat(match[1]));
      }
      return str; // Return original if not px or complex
    };

    // Convert properties to CSS string
    const styles: string[] = [];
    
    // Positioning (Absolute relative to parent)
    styles.push(`position: absolute`);
    styles.push(`left: ${toPercent(el.x, parentWidth)}`);
    styles.push(`top: ${toPercent(el.y, parentHeight)}`);
    styles.push(`width: ${toPercent(el.width, parentWidth)}`);
    styles.push(`height: ${toPercent(el.height, parentHeight)}`);
    
    if (el.rotation) {
      styles.push(`transform: rotate(${el.rotation}deg)`);
    }
    
    if (el.style.fill) {
      if (el.type === 'text') {
        styles.push(`color: ${el.style.fill}`);
      } else {
        styles.push(`background-color: ${el.style.fill}`);
      }
    }
    
    if (el.style.opacity !== undefined && el.style.opacity !== 1) {
      styles.push(`opacity: ${el.style.opacity}`);
    }
    
    if (el.style.borderRadius) {
      const rpxVal = pxStrToRpx(el.style.borderRadius);
      if (rpxVal) styles.push(`border-radius: ${rpxVal}`);
    } else {
       const tl = pxStrToRpx(el.style.borderTopLeftRadius);
       const tr = pxStrToRpx(el.style.borderTopRightRadius);
       const br = pxStrToRpx(el.style.borderBottomRightRadius);
       const bl = pxStrToRpx(el.style.borderBottomLeftRadius);
       if (tl) styles.push(`border-top-left-radius: ${tl}`);
       if (tr) styles.push(`border-top-right-radius: ${tr}`);
       if (br) styles.push(`border-bottom-right-radius: ${br}`);
       if (bl) styles.push(`border-bottom-left-radius: ${bl}`);
    }
    
    // Text styles
    if (el.type === 'text') {
      if (el.style.fontSize) styles.push(`font-size: ${toRpx(el.style.fontSize)}`);
      if (el.style.fontFamily) styles.push(`font-family: ${el.style.fontFamily}`);
      
      if (el.style.lineHeight) {
        if (el.style.lineHeight < 5) {
           styles.push(`line-height: ${el.style.lineHeight}`);
        } else {
           styles.push(`line-height: ${toRpx(el.style.lineHeight)}`);
        }
      }
      
      if (el.style.letterSpacing) styles.push(`letter-spacing: ${toRpx(el.style.letterSpacing)}`);
      if (el.style.textAlign) styles.push(`text-align: ${el.style.textAlign}`);
    }
    
    return styles.join('; ');
  }

  function cloneElement(id: string): EditorElement | null {
    const el = findElement(elements.value, id);
    if (!el) return null;
    
    // Deep clone
    const clone = JSON.parse(JSON.stringify(el));
    clone.id = `${el.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    clone.name = `${el.name} (Copy)`;
    clone.x += 20; // Offset slightly
    clone.y += 20;
    
    // Recursive ID update for children
    const updateIds = (element: EditorElement) => {
      element.id = `${element.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      if (element.children) {
        element.children.forEach(updateIds);
      }
    };
    
    // Clone children IDs
    if (clone.children) {
      clone.children.forEach(updateIds);
    }
    
    return clone;
  }

  function deleteSelected() {
    // Clone list to avoid modification during iteration issues if needed
    const ids = [...selectedElementIds.value];
    ids.forEach(id => removeElement(id));
    selectedElementIds.value = [];
  }

  return {
    scale,
    offset,
    isPanning,
    currentTool,
    currentSubTool,
    elements,
    selectedElementIds,
    hoveredElementId,
    isResizing,
    mouseDownOnElement,
    setTool,
    addElement,
    removeElement,
    updateElement,
    updateElementStyle,
    toggleExpand,
    toggleLock,
    toggleVisible,
    selectElement,
    findElement,
    moveElement,
    reparentElement,
    getGlobalPosition,
    exportToUVUE,
    cloneElement,
    deleteSelected,
    undo,
    redo,
    initHistory,
    findElementAndParent
  };
});
