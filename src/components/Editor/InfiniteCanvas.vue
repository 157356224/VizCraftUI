<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useEditorStore } from '../../stores/editor';
import CanvasElement from './CanvasElement.vue';
import { calculateSnapping, flattenElements } from '../../utils/snapping';
import type { SnapGuide } from '../../utils/snapping';

const store = useEditorStore();
const canvasRef = ref<HTMLElement | null>(null);

const transformStyle = computed(() => ({
  transform: `translate(${store.offset.x}px, ${store.offset.y}px) scale(${store.scale})`,
  transformOrigin: '0 0',
}));

// Panning Logic
let isDraggingCanvas = false;
let lastMousePos = { x: 0, y: 0 };

// Drawing Logic
let isDrawing = false;
let startDrawPos = { x: 0, y: 0 };
let currentDrawingId: string | null = null;
let hasStartedDrawing = false; // Track if we've actually created the element
const DRAG_THRESHOLD = 3; // Minimum pixels to move before creating element

// Dragging Element Logic
let isDraggingElement = false;
let draggedElementId: string | null = null;
let dragOffset = { x: 0, y: 0 };
const isSpacePressed = ref(false);

// Multi-selection dragging
const dragStartPositions = new Map<string, { x: number, y: number }>();

// Selection Box Logic
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
const selectionBox = ref<{ x: number, y: number, width: number, height: number } | null>(null);

// Snapping Logic
const alignmentGuides = ref<SnapGuide[]>([]);
let snapTargets: any[] = []; // Cache for drag session

function getCanvasCoordinates(e: MouseEvent) {
  if (!canvasRef.value) return { x: 0, y: 0 };
  
  // Get mouse position relative to viewport
  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Adjust for canvas offset and scale
  const canvasX = (mouseX - store.offset.x) / store.scale;
  const canvasY = (mouseY - store.offset.y) / store.scale;
  
  return { x: canvasX, y: canvasY };
}

function handleWheel(e: WheelEvent) {
  // Always prevent default to stop browser zoom
  e.preventDefault();
  
  if (e.altKey) {
    // Zoom with mouse position as center (Alt + Wheel)
    if (!canvasRef.value) return;
    
    const rect = canvasRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate canvas coordinates before zoom
    const canvasXBefore = (mouseX - store.offset.x) / store.scale;
    const canvasYBefore = (mouseY - store.offset.y) / store.scale;
    
    // Calculate new scale
    const zoomSpeed = 0.002;
    const delta = -e.deltaY;
    const oldScale = store.scale;
    const newScale = Math.max(0.1, Math.min(5, oldScale * (1 + delta * zoomSpeed)));
    store.scale = newScale;
    
    // Calculate canvas coordinates after zoom
    store.offset.x = mouseX - canvasXBefore * newScale;
    store.offset.y = mouseY - canvasYBefore * newScale;
  } else if (e.ctrlKey || e.metaKey) {
    // Ctrl + Wheel: Horizontal Pan
    // Map vertical scroll (deltaY) to horizontal offset (offset.x)
    store.offset.x -= e.deltaY;
    // Also handle horizontal scroll if present
    store.offset.x -= e.deltaX;
  } else {
    // Pan
    store.offset.x -= e.deltaX;
    store.offset.y -= e.deltaY;
  }
}

function handleCanvasMouseDown(e: MouseEvent) {
  // Panning check
  if (e.button === 1 || (store.currentTool === 'move' && store.currentSubTool === 'hand') || isSpacePressed.value) {
    isDraggingCanvas = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    return;
  }

  // Drawing Frame check
  if (store.currentTool === 'region' && store.currentSubTool === 'frame' && e.button === 0) {
     isDrawing = true;
     hasStartedDrawing = false;
     const { x, y } = getCanvasCoordinates(e);
     startDrawPos = { x, y };
     currentDrawingId = null; // Will be created on drag
     
     e.preventDefault();
     return;
  }

  // Drawing Text check
  if (store.currentTool === 'text' && store.currentSubTool === 'text' && e.button === 0) {
     isDrawing = true;
     hasStartedDrawing = false;
     const { x, y } = getCanvasCoordinates(e);
     startDrawPos = { x, y };
     currentDrawingId = null; // Will be created on drag
     
     e.preventDefault();
     return;
  }

  // Drawing Shape check
  if (store.currentTool === 'shape' && e.button === 0) {
     isDrawing = true;
     hasStartedDrawing = false;
     const { x, y } = getCanvasCoordinates(e);
     startDrawPos = { x, y };
     currentDrawingId = null; // Will be created on drag
     
     e.preventDefault();
     return;
  }

  // Move Tool Logic
  if (store.currentTool === 'move' && store.currentSubTool === 'move' && e.button === 0) {
    const target = e.target as HTMLElement;
    const elementWrapper = target.closest('.element-wrapper');
    
    if (elementWrapper) {
      // Element was clicked - this will be handled by CanvasElement's onMouseDown
      // Don't set mouseDownOnElement here, let CanvasElement handle it
      return; // Don't deselect or start canvas drag
    } else {
      // Clicked on empty canvas -> Start selection box
      store.mouseDownOnElement = false;
      store.selectedElementIds = [];
      
      // Start selection box
      isSelecting = true;
      const { x, y } = getCanvasCoordinates(e);
      selectionStart = { x, y };
      selectionBox.value = { x, y, width: 0, height: 0 };
      
      e.preventDefault();
    }
  }
}

function handleMouseMove(e: MouseEvent) {
  if (isDraggingCanvas) {
    store.hoveredElementId = null; // Clear hover when dragging canvas
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    store.offset.x += dx;
    store.offset.y += dy;
    lastMousePos = { x: e.clientX, y: e.clientY };
    return;
  }
  
  const { x, y } = getCanvasCoordinates(e);

  // Update selection box
  if (isSelecting && selectionBox.value) {
    const width = x - selectionStart.x;
    const height = y - selectionStart.y;
    
    selectionBox.value = {
      x: width > 0 ? selectionStart.x : x,
      y: height > 0 ? selectionStart.y : y,
      width: Math.abs(width),
      height: Math.abs(height)
    };
    return;
  }

  if (isDrawing) {
    store.hoveredElementId = null; // Clear hover when drawing
    const width = x - startDrawPos.x;
    const height = y - startDrawPos.y;
    
    // Check if we've moved enough to start drawing
    if (!hasStartedDrawing) {
      const distance = Math.sqrt(width * width + height * height);
      if (distance < DRAG_THRESHOLD) {
        // Haven't moved enough yet, don't create element
        return;
      }
      
      // We've moved enough, create the element now
      hasStartedDrawing = true;
      
      // Determine what type of element to create
      if (store.currentTool === 'region' && store.currentSubTool === 'frame') {
        const newId = `frame-${Date.now()}`;
        currentDrawingId = newId;
        
        store.addElement({
          id: newId,
          name: `画框 ${store.elements.length + 1}`,
          type: 'frame',
          x: startDrawPos.x,
          y: startDrawPos.y,
          width: 0,
          height: 0,
          rotation: 0,
          visible: true,
          locked: false,
          expanded: true,
          children: [],
          style: {
            fill: '#ffffff',
          }
        });
      } else if (store.currentTool === 'text' && store.currentSubTool === 'text') {
        const newId = `text-${Date.now()}`;
        currentDrawingId = newId;
        
        store.addElement({
          id: newId,
          name: `文本 ${store.elements.length + 1}`,
          type: 'text',
          x: startDrawPos.x,
          y: startDrawPos.y,
          width: 0,
          height: 0,
          rotation: 0,
          visible: true,
          locked: false,
          expanded: false,
          children: [],
          content: '文本',
          style: {
            fill: '#ffffff',
            fontSize: 16,
            fontFamily: 'Arial',
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: 'left',
            opacity: 1,
          }
        });
      } else if (store.currentTool === 'shape') {
        const subTool = store.currentSubTool as 'rect';
        const newId = `${subTool}-${Date.now()}`;
        currentDrawingId = newId;
        
        store.addElement({
          id: newId,
          name: `矩形 ${store.elements.length + 1}`,
          type: subTool,
          x: startDrawPos.x,
          y: startDrawPos.y,
          width: 0,
          height: 0,
          rotation: 0,
          visible: true,
          locked: false,
          expanded: false,
          children: [],
          style: {
            fill: '#d9d9d9',
            opacity: 1,
          }
        });
      }
    }
    
    // Update element if it exists
    if (currentDrawingId) {
      const el = store.findElement(store.elements, currentDrawingId);
      if (el) {
        el.x = width > 0 ? startDrawPos.x : x;
        el.y = height > 0 ? startDrawPos.y : y;
        el.width = Math.abs(width);
        el.height = Math.abs(height);
      }
    }
    return;
  }

  // Start dragging element if mouse is down and element is selected
  // AND mouse was initially pressed on an element
  if (!isDraggingElement && !isDrawing && !isDraggingCanvas && 
      !store.isResizing && // Don't start dragging if resizing
      store.mouseDownOnElement && // Only drag if mouse was pressed on element
      store.currentTool === 'move' && store.currentSubTool === 'move' &&
      store.selectedElementIds.length > 0 && e.buttons === 1) {
    
    const selectedId = store.selectedElementIds[0];
    if (!selectedId) return;
    
    const el = store.findElement(store.elements, selectedId);
    
    if (el && !el.locked) {
      // Check for Alt+Drag Copy
      if (e.altKey) {
        const clone = store.cloneElement(selectedId);
        if (clone) {
          const result = store.findElementAndParent(store.elements, selectedId);
          if (result) {
            clone.x = el.x;
            clone.y = el.y;
            
            result.parent.push(clone);
            store.selectElement(clone.id);
            
            draggedElementId = clone.id;
            dragOffset = { x: x - clone.x, y: y - clone.y };
            isDraggingElement = true;
            
            // Store initial positions for all selected elements
            dragStartPositions.clear();
            for (const id of store.selectedElementIds) {
              const elem = store.findElement(store.elements, id);
              if (elem) {
                dragStartPositions.set(id, { x: elem.x, y: elem.y });
              }
            }
            
            snapTargets = flattenElements(
              store.elements, 
              (item) => store.getGlobalPosition(item),
              draggedElementId
            );
            return;
          }
        }
      }
      
      isDraggingElement = true;
      draggedElementId = selectedId;
      dragOffset = { x: x - el.x, y: y - el.y };
      
      // Store initial positions for all selected elements
      dragStartPositions.clear();
      for (const id of store.selectedElementIds) {
        const elem = store.findElement(store.elements, id);
        if (elem) {
          dragStartPositions.set(id, { x: elem.x, y: elem.y });
        }
      }
      
      snapTargets = flattenElements(
        store.elements, 
        (item) => store.getGlobalPosition(item),
        draggedElementId
      );
    }
  }

  if (isDraggingElement && draggedElementId) {
    store.hoveredElementId = null; // Clear hover when dragging element
    const el = store.findElement(store.elements, draggedElementId);
    if (el) {
      // Proposed local position for the dragged element
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      
      // Calculate the delta from the original position
      const startPos = dragStartPositions.get(draggedElementId);
      if (startPos) {
        const deltaX = newX - startPos.x;
        const deltaY = newY - startPos.y;
        
        // Apply delta to all selected elements
        for (const id of store.selectedElementIds) {
          const elem = store.findElement(store.elements, id);
          const elemStartPos = dragStartPositions.get(id);
          if (elem && elemStartPos && !elem.locked) {
            elem.x = elemStartPos.x + deltaX;
            elem.y = elemStartPos.y + deltaY;
          }
        }
      }
      
      // For snapping, use the main dragged element
      const currentGlobal = store.getGlobalPosition(el);
      const parentGlobalX = currentGlobal.x - el.x;
      const parentGlobalY = currentGlobal.y - el.y;
      
      // 2. Proposed Global Position
      const proposedGlobalX = parentGlobalX + newX;
      const proposedGlobalY = parentGlobalY + newY;
      
      // 3. Snap
      const snapResult = calculateSnapping(
        { x: proposedGlobalX, y: proposedGlobalY, width: el.width, height: el.height },
        snapTargets
      );
      
      // 4. Calculate snap adjustment
      const snapDeltaX = snapResult.x - proposedGlobalX;
      const snapDeltaY = snapResult.y - proposedGlobalY;
      
      // 5. Apply snap adjustment to all selected elements
      if (startPos) {
        const deltaX = newX - startPos.x + snapDeltaX;
        const deltaY = newY - startPos.y + snapDeltaY;
        
        for (const id of store.selectedElementIds) {
          const elem = store.findElement(store.elements, id);
          const elemStartPos = dragStartPositions.get(id);
          if (elem && elemStartPos && !elem.locked) {
            elem.x = elemStartPos.x + deltaX;
            elem.y = elemStartPos.y + deltaY;
          }
        }
      }
      
      alignmentGuides.value = snapResult.guides;
    }
    return;
  }

  // If we are just moving mouse on canvas (not over element), clear hover
  if (!isDraggingCanvas && !isDrawing && !isDraggingElement) {
    const target = e.target as HTMLElement;
    if (!target.closest('.element-wrapper')) {
      store.hoveredElementId = null;
    }
  }
}

function handleMouseUp(e: MouseEvent) {
  isDraggingCanvas = false;
  store.mouseDownOnElement = false; // Reset flag
  alignmentGuides.value = []; // Clear guides
  snapTargets = []; // Clear cache
  
  // Handle selection box
  if (isSelecting && selectionBox.value) {
    // Find all elements within selection box
    const selectedIds = findElementsInBox(
      store.elements,
      selectionBox.value.x,
      selectionBox.value.y,
      selectionBox.value.width,
      selectionBox.value.height
    );
    
    if (selectedIds.length > 0) {
      store.selectedElementIds = selectedIds;
    }
    
    isSelecting = false;
    selectionBox.value = null;
  }
  
  if (isDraggingElement && draggedElementId) {
    // Handle Drop / Reparenting - check if parent changed FIRST
    // Get current mouse position
    const { x, y } = getCanvasCoordinates(e);
    
    // Find potential new parent (must be frame, expanded, and visible)
    const hitContainerId = findHitContainer(store.elements, x, y, draggedElementId);
    
    // Check if parent actually changed
    const currentParentResult = store.findElementAndParent(store.elements, draggedElementId);
    let currentParentId: string | null = null;
    
    if (currentParentResult) {
      // Find the parent element's ID
      const parentArray = currentParentResult.parent;
      if (parentArray !== store.elements) {
        // It has a parent (not root)
        // Find which element's children array this is
        const findParentId = (list: any[]): string | null => {
          for (const el of list) {
            if (el.children === parentArray) {
              return el.id;
            }
            if (el.children && el.children.length > 0) {
              const found = findParentId(el.children);
              if (found) return found;
            }
          }
          return null;
        };
        currentParentId = findParentId(store.elements);
      }
    }
    
    // Only reparent if the parent actually changed
    if (hitContainerId !== currentParentId) {
      if (hitContainerId !== undefined) {
        store.reparentElement(draggedElementId, hitContainerId);
      } else if (currentParentId !== null) {
        // Dropped on empty canvas and currently has a parent -> Move to root
        store.reparentElement(draggedElementId, null);
      }
      // If hitContainerId is undefined and currentParentId is null, element is already at root, do nothing
    } else {
      // Parent didn't change - record position changes for all selected elements
      for (const id of store.selectedElementIds) {
        const elem = store.findElement(store.elements, id);
        if (elem && !elem.locked) {
          store.updateElement(id, { x: elem.x, y: elem.y });
        }
      }
    }
    
    // Clear drag start positions
    dragStartPositions.clear();
  }

  isDraggingElement = false;
  draggedElementId = null;
  
  if (isDrawing) {
    // If we didn't actually create an element (didn't drag enough), don't switch tools
    if (!hasStartedDrawing) {
      isDrawing = false;
      hasStartedDrawing = false;
      currentDrawingId = null;
      return;
    }
    
    isDrawing = false;
    hasStartedDrawing = false;
    currentDrawingId = null;
    store.setTool('move', 'move');
  }
}

// Helper to find container under point
function findHitContainer(list: any[], x: number, y: number, excludeId: string): string | null | undefined {
  // We want to find the top-most visual element that is a container (frame)
  // Reverse iterate to find top-most
  for (let i = list.length - 1; i >= 0; i--) {
    const el = list[i];
    if (el.id === excludeId) continue;
    if (!el.visible) continue;
    
    // Check bounds
    if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
      // It's a hit.
      // If it's a frame/container, check its children first
      if (el.type === 'frame') { // Only frames are containers for now
        // Local coordinates for children
        const localX = x - el.x;
        const localY = y - el.y;
        
        const childHit = findHitContainer(el.children, localX, localY, excludeId);
        if (childHit !== undefined) return childHit; // Found a deeper container
        
        return el.id; // Return this container
      }
    }
  }
  return undefined; // No hit in this list
}

// Helper to find elements within selection box
function findElementsInBox(list: any[], boxX: number, boxY: number, boxWidth: number, boxHeight: number, parentOffset = { x: 0, y: 0 }): string[] {
  const result: string[] = [];
  
  for (const el of list) {
    if (!el.visible) continue;
    
    // Calculate global position
    const globalX = parentOffset.x + el.x;
    const globalY = parentOffset.y + el.y;
    
    // Check if element intersects with selection box
    const intersects = !(
      globalX + el.width < boxX ||
      globalX > boxX + boxWidth ||
      globalY + el.height < boxY ||
      globalY > boxY + boxHeight
    );
    
    if (intersects) {
      result.push(el.id);
    }
    
    // Check children recursively
    if (el.children && el.children.length > 0) {
      const childResults = findElementsInBox(
        el.children,
        boxX,
        boxY,
        boxWidth,
        boxHeight,
        { x: globalX, y: globalY }
      );
      result.push(...childResults);
    }
  }
  
  return result;
}

function handleKeyDown(e: KeyboardEvent) {
  // Prevent Alt key from triggering browser menu
  if (e.altKey) {
    e.preventDefault();
  }

  // Prevent browser zoom shortcuts (Ctrl + +/-/0)
  if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '0')) {
    e.preventDefault();
    return;
  }
  
  // Prevent browser menu (Alt)
  if (e.key === 'Alt') {
    e.preventDefault();
  }

  // Check for Delete key
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const target = e.target as HTMLElement;
    // Don't delete if typing in input
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      store.deleteSelected();
      e.preventDefault();
    }
  }

  // Check for Copy/Paste/SelectAll
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'c') {
      // Copy
      if (store.selectedElementIds.length === 1) {
        // Simple clipboard implementation using localStorage or memory
        // For browser clipboard, we need to serialize
        const id = store.selectedElementIds[0];
        if (id) {
          const el = store.findElement(store.elements, id);
          if (el) {
            localStorage.setItem('editor_clipboard', JSON.stringify(el));
          }
        }
      }
    } else if (e.key === 'v') {
      // Paste
      const clipboardData = localStorage.getItem('editor_clipboard');
      if (clipboardData) {
        try {
          const elData = JSON.parse(clipboardData);
          // We need to clone it properly with new ID
          // We can use the store.cloneElement logic but we need to adapt it since we are pasting raw data
          // Let's manually reconstruct
          // Actually, we can just add it as a new element with offset
          
          // Generate new ID
          const newId = `${elData.type}-${Date.now()}`;
          elData.id = newId;
          elData.name = `${elData.name} (Paste)`;
          elData.x += 20;
          elData.y += 20;
          
          // Recursive ID update
          const updateIds = (element: any) => {
            element.id = `${element.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            if (element.children) {
              element.children.forEach(updateIds);
            }
          };
          if (elData.children) elData.children.forEach(updateIds);
          
          store.addElement(elData);
          store.selectElement(newId);
        } catch (err) {
          console.error('Paste failed', err);
        }
      }
    } else if (e.key === 'a') {
      // Select All
      e.preventDefault();
      
      // Get all element IDs
      const allIds: string[] = [];
      const collectIds = (elements: any[]) => {
        for (const el of elements) {
          allIds.push(el.id);
          // Optionally select children too, or just top-level
          // Figma usually selects all top-level or current context
          // Let's select everything for now
          if (el.children) {
            collectIds(el.children);
          }
        }
      };
      
      collectIds(store.elements);
      store.selectedElementIds = allIds;
    }
  }

  if (e.code === 'Space' && !e.repeat) {
    // Only prevent default if we are not focused on an input
    const target = e.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      isSpacePressed.value = true;
      e.preventDefault();
    }
  }
  
  // Undo / Redo
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault();
      store.undo();
    } else if (e.key === 'y') {
      e.preventDefault();
      store.redo();
    }
  }
}

function handleKeyUp(e: KeyboardEvent) {
  // Prevent Alt key from triggering browser menu
  if (e.key === 'Alt') {
    e.preventDefault();
  }
  
  if (e.code === 'Space') {
    isSpacePressed.value = false;
    isDraggingCanvas = false; // Stop dragging if space is released
  }
}

// Drag and Drop Image Support
function handleDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  
  if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
  
  const file = e.dataTransfer.files[0];
  if (!file) return;
  
  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    alert('请拖入图片文件');
    return;
  }
  
  // Read file as data URL
  const reader = new FileReader();
  reader.onload = (event) => {
    const imageUrl = event.target?.result as string;
    
    // Get drop position in canvas coordinates
    const { x, y } = getCanvasCoordinates(e as any);
    
    // Create image element to get dimensions
    const img = new Image();
    img.onload = () => {
      const newId = `image-${Date.now()}`;
      
      store.addElement({
        id: newId,
        name: `图片 ${store.elements.length + 1}`,
        type: 'image',
        x: x,
        y: y,
        width: img.width,
        height: img.height,
        rotation: 0,
        visible: true,
        locked: false,
        expanded: false,
        children: [],
        imageUrl: imageUrl,
        style: {
          opacity: 1,
        }
      });
      
      // Select the new image
      store.selectElement(newId);
    };
    img.src = imageUrl;
  };
  
  reader.readAsDataURL(file);
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove, true); // Use capture to ensure we get events even if stopped
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  // Add drag and drop listeners
  if (canvasRef.value) {
    canvasRef.value.addEventListener('dragover', handleDragOver);
    canvasRef.value.addEventListener('drop', handleDrop);
  }
  
  // Initialize history if empty
  store.initHistory();
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove, true);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  
  // Remove drag and drop listeners
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('dragover', handleDragOver);
    canvasRef.value.removeEventListener('drop', handleDrop);
  }
});
</script>

<template>
  <div 
    ref="canvasRef" 
    class="infinite-canvas"
    @wheel="handleWheel"
    @mousedown="handleCanvasMouseDown"
    :style="{ 
      cursor: (store.currentSubTool === 'hand' || isSpacePressed) ? (isDraggingCanvas ? 'grabbing' : 'grab') : (store.currentTool === 'region' && store.currentSubTool === 'frame' ? 'crosshair' : 'default'),
      backgroundPosition: `${store.offset.x}px ${store.offset.y}px`,
      backgroundSize: `${20 * store.scale}px ${20 * store.scale}px`
    }"
  >
    <div class="canvas-content" :style="transformStyle">
      <!-- Grid Background (Optional) -->
      
      <!-- Render Elements -->
      <CanvasElement 
        v-for="element in store.elements" 
        :key="element.id" 
        :element="element" 
      />
      
      <!-- Drawing Dimensions Label -->
      <div v-if="isDrawing && currentDrawingId" class="drawing-label" 
           :style="{ 
             left: `${(store.findElement(store.elements, currentDrawingId)?.x || 0) + (store.findElement(store.elements, currentDrawingId)?.width || 0) / 2}px`, 
             top: `${(store.findElement(store.elements, currentDrawingId)?.y || 0) + (store.findElement(store.elements, currentDrawingId)?.height || 0) + 10}px`
           }">
         {{ Math.round(store.findElement(store.elements, currentDrawingId)?.width || 0) }} × {{ Math.round(store.findElement(store.elements, currentDrawingId)?.height || 0) }}
      </div>

      <!-- Alignment Guides -->
      <template v-for="(guide, index) in alignmentGuides" :key="index">
        <!-- The Line -->
        <div class="alignment-guide"
             :class="guide.type"
             :style="{
               left: guide.type === 'vertical' ? `${guide.position}px` : `${guide.start}px`,
               top: guide.type === 'horizontal' ? `${guide.position}px` : `${guide.start}px`,
               width: guide.type === 'horizontal' ? `${guide.end - guide.start}px` : '1px',
               height: guide.type === 'vertical' ? `${guide.end - guide.start}px` : '1px'
             }"
        >
          <!-- X markers at ends -->
          <div class="x-marker start">×</div>
          <div class="x-marker end">×</div>
        </div>

        <!-- Distance Labels -->
        <div v-for="(dist, dIndex) in guide.distances" :key="`${index}-dist-${dIndex}`" 
             class="distance-label"
             :style="{
               left: `${dist.x}px`,
               top: `${dist.y}px`
             }">
          {{ dist.value }}
        </div>
      </template>

      <!-- Selection Box -->
      <div v-if="selectionBox" class="selection-box"
           :style="{
             left: `${selectionBox.x}px`,
             top: `${selectionBox.y}px`,
             width: `${selectionBox.width}px`,
             height: `${selectionBox.height}px`
           }">
      </div>
    </div>
  </div>
</template>

<style scoped>
.infinite-canvas {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  overflow: hidden;
  position: relative;
  /* Dot grid pattern */
  background-image: radial-gradient(#444 1px, transparent 1px);
  background-size: 20px 20px;
}

.canvas-content {
  width: 0;
  height: 0;
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.drawing-label {
  position: absolute;
  transform: translateX(-50%);
  background-color: #007acc;
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 10px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 200;
}

.alignment-guide {
  position: absolute;
  background-color: #ff0055; /* High contrast red/pink */
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.x-marker {
  position: absolute;
  color: #ff0055;
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}

.alignment-guide.vertical .x-marker.start { top: -5px; left: -3px; }
.alignment-guide.vertical .x-marker.end { bottom: -5px; left: -3px; }
.alignment-guide.horizontal .x-marker.start { left: -5px; top: -5px; }
.alignment-guide.horizontal .x-marker.end { right: -5px; top: -5px; }

.distance-label {
  position: absolute;
  transform: translate(-50%, -50%);
  background-color: #ff4d4f;
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 10px;
  z-index: 1001;
  pointer-events: none;
  white-space: nowrap;
}

.selection-box {
  position: absolute;
  border: 1px dashed #007acc;
  background-color: rgba(0, 122, 204, 0.1);
  pointer-events: none;
  z-index: 1000;
}
</style>
