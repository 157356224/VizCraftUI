<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useEditorStore } from '../../stores/editor';
import CanvasElement from './CanvasElement.vue'; // Recursive import
import { Code } from 'lucide-vue-next';

const props = defineProps<{
  element: any;
}>();

const store = useEditorStore();
const isEditing = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Frame label rename
const isRenamingFrame = ref(false);
const frameNameInput = ref<HTMLInputElement | null>(null);
const tempFrameName = ref('');

const wrapperStyle = computed(() => {
  const { x, y, width, height, rotation, style, type } = props.element;
  
  const s: any = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}deg)`,
    boxSizing: 'border-box',
    border: style.stroke ? `${style.strokeWidth || 1}px solid ${style.stroke}` : 'none',
    backgroundColor: style.fill || 'transparent',
    opacity: style.opacity ?? 1,
    borderRadius: style.borderRadius || '0px',
    borderTopLeftRadius: style.borderTopLeftRadius,
    borderTopRightRadius: style.borderTopRightRadius,
    borderBottomRightRadius: style.borderBottomRightRadius,
    borderBottomLeftRadius: style.borderBottomLeftRadius,
  };

  if (type === 'frame') {
    s.backgroundColor = style.fill || '#ffffff'; 
    // Removed overflow: hidden from wrapper
  }

  if (type === 'text') {
    s.backgroundColor = 'transparent'; // Text background usually transparent
    // If user wants background, they can set it, but usually text tool implies text color.
    // But we used style.fill as text color for text.
    // So background should be transparent.
  }

  if (!props.element.visible) {
    s.display = 'none';
  }

  return s;
});

const contentStyle = computed(() => {
  const { type } = props.element;
  const s: any = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };
  
  if (type === 'frame' || type === 'carousel') {
    s.overflow = 'hidden';
    
    // Apply border radius to content as well to clip children
    const { style } = props.element;
    if (style.borderRadius) s.borderRadius = style.borderRadius;
    if (style.borderTopLeftRadius) s.borderTopLeftRadius = style.borderTopLeftRadius;
    if (style.borderTopRightRadius) s.borderTopRightRadius = style.borderTopRightRadius;
    if (style.borderBottomRightRadius) s.borderBottomRightRadius = style.borderBottomRightRadius;
    if (style.borderBottomLeftRadius) s.borderBottomLeftRadius = style.borderBottomLeftRadius;
  }
  
  return s;
});

const textStyle = computed(() => {
  const { style } = props.element;
  return {
    fontSize: `${style.fontSize || 16}px`,
    fontFamily: style.fontFamily || 'Arial',
    lineHeight: style.lineHeight || 1.2,
    letterSpacing: `${style.letterSpacing || 0}px`,
    textAlign: style.textAlign || 'left',
    color: style.fill || '#000000', // Use fill as text color
    whiteSpace: 'pre-wrap',
    width: '100%',
    height: '100%',
    outline: 'none',
    border: 'none',
    background: 'transparent',
    resize: 'none' as const,
    overflow: 'hidden',
    padding: '0',
    margin: '0',
    display: 'block',
  };
});

function onMouseDown(e: MouseEvent) {
  if (props.element.locked) return;
  
  // Stop propagation to prevent parent elements from being selected
  e.stopPropagation();
  
  // Mark that mouse was pressed on an element
  store.mouseDownOnElement = true;
  
  // If clicking on an already selected element (and not holding Shift), don't change selection
  // This allows dragging multiple selected elements
  if (store.selectedElementIds.includes(props.element.id) && !e.shiftKey) {
    // Element is already selected, don't change selection
    return;
  }
  
  store.selectElement(props.element.id, e.shiftKey);
}

function onDblClick(e: MouseEvent) {
  if (props.element.type === 'text' && !props.element.locked) {
    e.stopPropagation();
    isEditing.value = true;
    nextTick(() => {
      textareaRef.value?.focus();
    });
  }
}

function onBlur() {
  if (isEditing.value) {
    isEditing.value = false;
  }
}

function updateContent(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value;
  store.updateElement(props.element.id, { content: val });
}

// Frame label rename functions
function startFrameRename(e: MouseEvent) {
  e.stopPropagation();
  isRenamingFrame.value = true;
  tempFrameName.value = props.element.name;
  
  nextTick(() => {
    if (frameNameInput.value) {
      frameNameInput.value.focus();
      frameNameInput.value.select();
    }
  });
}

function finishFrameRename() {
  if (tempFrameName.value.trim()) {
    store.updateElement(props.element.id, { name: tempFrameName.value.trim() });
  }
  isRenamingFrame.value = false;
}

function cancelFrameRename() {
  isRenamingFrame.value = false;
  tempFrameName.value = '';
}

function handleFrameRenameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    finishFrameRename();
  } else if (e.key === 'Escape') {
    cancelFrameRename();
  }
}

// Copy code function
function copyFrameCode(e: MouseEvent) {
  e.stopPropagation();
  
  if (props.element.type !== 'frame') return;
  
  const code = store.exportToUVUE(props.element);
  
  // Copy to clipboard
  navigator.clipboard.writeText(code).then(() => {
    // Show success feedback (you can add a toast notification here)
    console.log('代码已复制到剪贴板');
  }).catch(err => {
    console.error('复制失败:', err);
  });
}

function onWrapperMouseMove(e: MouseEvent) {
  // Only handle hover logic if not dragging canvas/element
  e.stopPropagation(); // Stop parent from getting hovered
  store.hoveredElementId = props.element.id;
}

function onMouseLeave() {
  // Don't clear hover immediately to allow resize handles to work
}

function onResizeMouseDown(e: MouseEvent, edge: string) {
  if (props.element.locked) return;
  
  e.stopPropagation();
  e.preventDefault();
  
  // Select element if not already selected
  if (!store.selectedElementIds.includes(props.element.id)) {
    store.selectElement(props.element.id);
  }
  
  // Set flag to prevent dragging during resize
  store.isResizing = true;
  
  const startX = e.clientX;
  const startY = e.clientY;
  const startElementX = props.element.x;
  const startElementY = props.element.y;
  const startWidth = props.element.width;
  const startHeight = props.element.height;
  
  const handleMouseMove = (me: MouseEvent) => {
    me.preventDefault();
    me.stopPropagation();
    
    const dx = (me.clientX - startX) / store.scale;
    const dy = (me.clientY - startY) / store.scale;
    
    let newX = startElementX;
    let newY = startElementY;
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    // Handle horizontal resize
    if (edge.includes('left')) {
      newX = startElementX + dx;
      newWidth = startWidth - dx;
    } else if (edge.includes('right')) {
      newWidth = startWidth + dx;
    }
    
    // Handle vertical resize
    if (edge.includes('top')) {
      newY = startElementY + dy;
      newHeight = startHeight - dy;
    } else if (edge.includes('bottom')) {
      newHeight = startHeight + dy;
    }

    // Maintain aspect ratio if Shift is pressed (only for corner resizing)
      if (me.shiftKey && (edge.includes('left') || edge.includes('right')) && (edge.includes('top') || edge.includes('bottom'))) {
        
        // Calculate the ratio based on the larger change
        const scaleX = newWidth / startWidth;
        const scaleY = newHeight / startHeight;
        
        // Use the larger scale factor (in absolute terms) to drive both dimensions
        // Note: we use Math.max to find the "most moved" axis
        const scale = Math.abs(scaleX - 1) > Math.abs(scaleY - 1) ? scaleX : scaleY;
        
        const adjustedWidth = startWidth * scale;
        const adjustedHeight = startHeight * scale;
        
        // Adjust position if resizing from top or left
        if (edge.includes('left')) {
          newX = startElementX + (startWidth - adjustedWidth);
        }
        if (edge.includes('top')) {
          newY = startElementY + (startHeight - adjustedHeight);
        }
        
        newWidth = adjustedWidth;
        newHeight = adjustedHeight;
      }
    
    // Minimum size constraint
    const minSize = 10;
    if (newWidth < minSize) {
      if (edge.includes('left')) {
        newX = startElementX + startWidth - minSize;
      }
      newWidth = minSize;
    }
    if (newHeight < minSize) {
      if (edge.includes('top')) {
        newY = startElementY + startHeight - minSize;
      }
      newHeight = minSize;
    }
    
    // Update element directly without triggering history on every move
    const el = store.findElement(store.elements, props.element.id);
    if (el) {
      el.x = newX;
      el.y = newY;
      el.width = newWidth;
      el.height = newHeight;
    }
  };
  
  const handleMouseUp = (me: MouseEvent) => {
    me.preventDefault();
    me.stopPropagation();
    
    // Clear resize flag
    store.isResizing = false;
    
    // Record final state to history
    store.updateElement(props.element.id, {
      x: props.element.x,
      y: props.element.y,
      width: props.element.width,
      height: props.element.height
    });
    
    window.removeEventListener('mousemove', handleMouseMove, true);
    window.removeEventListener('mouseup', handleMouseUp, true);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  
  // Set cursor style and disable text selection
  const cursorMap: Record<string, string> = {
    'top': 'ns-resize',
    'bottom': 'ns-resize',
    'left': 'ew-resize',
    'right': 'ew-resize',
    'top-left': 'nwse-resize',
    'top-right': 'nesw-resize',
    'bottom-left': 'nesw-resize',
    'bottom-right': 'nwse-resize',
  };
  document.body.style.cursor = cursorMap[edge] || 'default';
  document.body.style.userSelect = 'none';
  
  // Use capture phase to ensure we get all events
  window.addEventListener('mousemove', handleMouseMove, true);
  window.addEventListener('mouseup', handleMouseUp, true);
}

// Auto-play for carousel
let intervalId: number | null = null;

function startCarousel() {
  stopCarousel();
  if (props.element.type === 'carousel' && props.element.images?.length > 1) {
    const interval = props.element.interval || 3000;
    intervalId = window.setInterval(() => {
      const nextIndex = ((props.element.currentIndex || 0) + 1) % props.element.images.length;
      store.updateElement(props.element.id, { currentIndex: nextIndex });
    }, interval);
  }
}

function stopCarousel() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

watch(() => [props.element.type, props.element.interval, props.element.images?.length], () => {
  if (props.element.type === 'carousel') {
    startCarousel();
  } else {
    stopCarousel();
  }
});

onMounted(() => {
  if (props.element.type === 'carousel') {
    startCarousel();
  }
});

onUnmounted(() => {
  stopCarousel();
});

watch(() => props.element.interval, () => {
  if (props.element.type === 'carousel') {
    startCarousel();
  }
});

watch(() => props.element.images, () => {
    if (props.element.type === 'carousel') {
        startCarousel();
    }
}, { deep: true });
</script>

<template>
  <div 
    class="element-wrapper"
    :style="wrapperStyle"
    @mousedown="onMouseDown"
    @dblclick="onDblClick"
    @mousemove="onWrapperMouseMove"
    @mouseleave="onMouseLeave"
    :class="{ 
      selected: store.selectedElementIds.includes(element.id), 
      locked: element.locked,
      hovered: store.hoveredElementId === element.id && !store.selectedElementIds.includes(element.id)
    }"
  >
    <!-- Resize handles overlay - always visible when hovered or selected -->
    <div 
      v-if="(store.hoveredElementId === element.id || store.selectedElementIds.includes(element.id)) && !element.locked"
      class="resize-handles"
    >
      <div class="resize-handle top" @mousedown.stop="onResizeMouseDown($event, 'top')"></div>
      <div class="resize-handle right" @mousedown.stop="onResizeMouseDown($event, 'right')"></div>
      <div class="resize-handle bottom" @mousedown.stop="onResizeMouseDown($event, 'bottom')"></div>
      <div class="resize-handle left" @mousedown.stop="onResizeMouseDown($event, 'left')"></div>
      <div class="resize-handle top-left" @mousedown.stop="onResizeMouseDown($event, 'top-left')"></div>
      <div class="resize-handle top-right" @mousedown.stop="onResizeMouseDown($event, 'top-right')"></div>
      <div class="resize-handle bottom-left" @mousedown.stop="onResizeMouseDown($event, 'bottom-left')"></div>
      <div class="resize-handle bottom-right" @mousedown.stop="onResizeMouseDown($event, 'bottom-right')"></div>
    </div>

    <!-- Element Content (with optional overflow clipping) -->
    <div class="element-content" :style="contentStyle">
      <!-- Image Element -->
      <img 
        v-if="element.type === 'image'" 
        :src="element.imageUrl" 
        class="image-element"
        style="width: 100%; height: 100%; object-fit: fill; pointer-events: none;"
        draggable="false"
      />

      <!-- Carousel Element -->
      <div v-if="element.type === 'carousel'" class="carousel-element" style="width: 100%; height: 100%; position: relative; overflow: hidden;">
        <div 
          class="carousel-track"
          :style="{
            transform: `translateX(-${(element.currentIndex || 0) * 100}%)`,
            transition: 'transform 0.3s ease-in-out',
            display: 'flex',
            height: '100%'
          }"
        >
          <div 
            v-for="(img, index) in element.images" 
            :key="index"
            class="carousel-slide"
            style="min-width: 100%; height: 100%;"
          >
            <img 
              :src="img" 
              style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;"
              draggable="false"
            />
          </div>
        </div>
        
        <!-- Navigation Dots -->
        <div class="carousel-dots" style="position: absolute; bottom: 10px; left: 0; right: 0; display: flex; justify-content: center; gap: 6px;">
          <div 
            v-for="(_, index) in element.images" 
            :key="index"
            class="dot"
            :style="{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: (element.currentIndex || 0) === index ? '#fff' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer'
            }"
            @click.stop="store.updateElement(element.id, { currentIndex: Number(index) })"
          ></div>
        </div>
      </div>

      <!-- Text Element -->
      <div v-if="element.type === 'text'" class="text-container" style="width: 100%; height: 100%;">
        <textarea 
          v-if="isEditing"
          ref="textareaRef"
          :value="element.content"
          @input="updateContent"
          @blur="onBlur"
          @mousedown.stop
          class="text-editor"
          :style="textStyle"
        ></textarea>
        <div v-else class="text-display" :style="textStyle">
          {{ element.content }}
        </div>
      </div>

      <!-- Recursive rendering -->
      <CanvasElement 
        v-for="child in element.children" 
        :key="child.id" 
        :element="child" 
      />
    </div>

    <!-- UI Elements (Labels) - Outside content clipping -->
    <div v-if="element.type === 'frame'" class="frame-label">
      <span v-if="!isRenamingFrame" @dblclick="startFrameRename">{{ element.name }}</span>
      <input 
        v-else
        ref="frameNameInput"
        v-model="tempFrameName"
        class="frame-name-input"
        @blur="finishFrameRename"
        @keydown="handleFrameRenameKeydown"
        @click.stop
        @mousedown.stop
      />
    </div>

    <!-- Copy Code Button - Top Right Corner -->
    <div 
      v-if="element.type === 'frame' && store.selectedElementIds.includes(element.id)" 
      class="copy-code-btn"
      @click="copyFrameCode"
      @mousedown.stop
      title="复制 uvue 代码"
    >
      <Code :size="16" />
    </div>

    <!-- Size Label -->
    <div v-if="store.selectedElementIds.includes(element.id)" class="size-label">
      {{ Math.round(element.width) }} × {{ Math.round(element.height) }}
    </div>
  </div>
</template>

<style scoped>
.element-wrapper {
  pointer-events: auto;
  user-select: none;
}

.element-wrapper.selected {
  outline: 2px solid #007acc;
  /* Removed z-index to preserve original stacking order */
}

.element-wrapper.locked {
  pointer-events: none;
}

.element-wrapper.hovered {
  outline: 2px solid #007acc;
}

/* Ensure content clipping works for frames */
.element-content {
  box-sizing: border-box;
}

.resize-handles {
  position: absolute;
  top: -4px;
  left: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  pointer-events: none;
  z-index: 1000;
}

.resize-handle {
  position: absolute;
  pointer-events: auto;
  background: transparent;
  z-index: 1001;
}

/* Edge handles - larger hit areas */
.resize-handle.top {
  top: 0;
  left: 8px;
  width: calc(100% - 16px);
  height: 8px;
  cursor: ns-resize;
}

.resize-handle.bottom {
  bottom: 0;
  left: 8px;
  width: calc(100% - 16px);
  height: 8px;
  cursor: ns-resize;
}

.resize-handle.left {
  left: 0;
  top: 8px;
  width: 8px;
  height: calc(100% - 16px);
  cursor: ew-resize;
}

.resize-handle.right {
  right: 0;
  top: 8px;
  width: 8px;
  height: calc(100% - 16px);
  cursor: ew-resize;
}

/* Corner handles - priority over edges */
.resize-handle.top-left {
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  cursor: nwse-resize;
  z-index: 1002;
  background: white;
  border: 1px solid #007acc;
  box-sizing: border-box;
}

.resize-handle.top-right {
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  cursor: nesw-resize;
  z-index: 1002;
  background: white;
  border: 1px solid #007acc;
  box-sizing: border-box;
}

.resize-handle.bottom-left {
  bottom: 0;
  left: 0;
  width: 8px;
  height: 8px;
  cursor: nesw-resize;
  z-index: 1002;
  background: white;
  border: 1px solid #007acc;
  box-sizing: border-box;
}

.resize-handle.bottom-right {
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  cursor: nwse-resize;
  z-index: 1002;
  background: white;
  border: 1px solid #007acc;
  box-sizing: border-box;
}

.frame-label {
  position: absolute;
  top: -24px;
  left: 0;
  color: #666;
  font-size: 12px;
  background: rgba(255,255,255,0.8);
  padding: 2px 4px;
  border-radius: 2px;
  white-space: nowrap;
}

.frame-label span {
  cursor: pointer;
}

.frame-name-input {
  background: white;
  border: 1px solid #007acc;
  color: #333;
  padding: 2px 4px;
  font-size: 12px;
  outline: none;
  border-radius: 2px;
  min-width: 100px;
}

.copy-code-btn {
  position: absolute;
  top: -24px;
  right: 0;
  background: #22c55e;
  color: white;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.copy-code-btn:hover {
  background: #16a34a;
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.copy-code-btn:active {
  transform: scale(0.95);
}

.size-label {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #007acc;
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 10px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 200; /* Ensure label is on top */
}
</style>
