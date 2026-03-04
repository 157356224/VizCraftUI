<script setup lang="ts">
import { useEditorStore } from '../../stores/editor';
import { 
  ChevronRight, ChevronDown, Hash, Square, Type, Image as ImageIcon,
  Lock, Unlock, Eye, EyeOff, Trash2 
} from 'lucide-vue-next';
import { computed, ref } from 'vue';

// Self-reference for recursion
import LayerTree from './LayerTree.vue'; 

const store = useEditorStore();

const props = defineProps<{
  element: any;
  depth?: number;
}>();

const depthLevel = computed(() => props.depth || 0);

const iconMap: Record<string, any> = {
  frame: Hash,
  rect: Square,
  text: Type,
  image: ImageIcon
};

const ElementIcon = computed(() => iconMap[props.element.type] || Square);

// Drag state
const dropPosition = ref<'before' | 'after' | 'inside' | null>(null);
const isDragging = ref(false);

// Rename state
const isRenaming = ref(false);
const renameInput = ref<HTMLInputElement | null>(null);
const tempName = ref('');

function handleSelect() {
  store.selectElement(props.element.id);
}

function startRename(e: Event) {
  e.stopPropagation();
  isRenaming.value = true;
  tempName.value = props.element.name;
  
  // Focus input after render
  setTimeout(() => {
    if (renameInput.value) {
      renameInput.value.focus();
      renameInput.value.select();
    }
  }, 0);
}

function finishRename() {
  if (tempName.value.trim()) {
    store.updateElement(props.element.id, { name: tempName.value.trim() });
  }
  isRenaming.value = false;
}

function cancelRename() {
  isRenaming.value = false;
  tempName.value = '';
}

function handleRenameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    finishRename();
  } else if (e.key === 'Escape') {
    cancelRename();
  }
}

function toggleExpand(e: Event) {
  e.stopPropagation();
  store.toggleExpand(props.element.id);
}

function toggleLock(e: Event) {
  e.stopPropagation();
  store.toggleLock(props.element.id);
}

function toggleVisible(e: Event) {
  e.stopPropagation();
  store.toggleVisible(props.element.id);
}

function removeElement(e: Event) {
  e.stopPropagation();
  store.removeElement(props.element.id);
}

// Custom Drag and Drop
function onDragStart(e: DragEvent) {
  e.stopPropagation();
  isDragging.value = true;
  
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', props.element.id);
    
    // Create custom drag image
    const dragElement = e.currentTarget as HTMLElement;
    const clone = dragElement.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.width = dragElement.offsetWidth + 'px';
    clone.style.backgroundColor = '#094771';
    clone.style.borderRadius = '4px';
    clone.style.opacity = '0.9';
    document.body.appendChild(clone);
    
    e.dataTransfer.setDragImage(clone, 0, 0);
    
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(clone);
    }, 0);
  }
}

function onDragEnd() {
  isDragging.value = false;
  dropPosition.value = null;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  
  const dragId = e.dataTransfer?.getData('text/plain');
  if (dragId === props.element.id) {
    dropPosition.value = null;
    return;
  }
  
  // Calculate drop position based on mouse Y position
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const y = e.clientY - rect.top;
  const height = rect.height;
  
  // Divide into three zones
  const topZone = height * 0.25;
  const bottomZone = height * 0.75;
  
  if (y < topZone) {
    dropPosition.value = 'before';
  } else if (y > bottomZone) {
    dropPosition.value = 'after';
  } else {
    // Middle zone - only allow 'inside' for frames
    if (props.element.type === 'frame') {
      dropPosition.value = 'inside';
    } else {
      // For non-frames, prefer 'after' in middle zone
      dropPosition.value = 'after';
    }
  }
}

function onDragLeave(e: DragEvent) {
  // Only clear if actually leaving this element (not entering a child)
  const relatedTarget = e.relatedTarget as HTMLElement;
  if (!relatedTarget || !(e.currentTarget as HTMLElement).contains(relatedTarget)) {
    dropPosition.value = null;
  }
}

function onDrop(e: DragEvent) {
  e.stopPropagation();
  e.preventDefault();
  
  const dragId = e.dataTransfer?.getData('text/plain');
  if (dragId && dragId !== props.element.id && dropPosition.value) {
    store.moveElement(dragId, props.element.id, dropPosition.value);
  }
  
  dropPosition.value = null;
}
</script>

<template>
  <div class="layer-node" :class="{ dragging: isDragging }">
    <div class="layer-row-wrapper">
      <!-- Drop indicator line - before -->
      <div v-if="dropPosition === 'before'" class="drop-indicator before"></div>
      
      <div class="layer-row" 
           :class="{ 
             selected: store.selectedElementIds.includes(element.id),
             'drop-target-inside': dropPosition === 'inside'
           }"
           :style="{ paddingLeft: `${depthLevel * 16 + 8}px` }"
           @click="handleSelect"
           draggable="true"
           @dragstart="onDragStart"
           @dragend="onDragEnd"
           @dragover="onDragOver"
           @dragleave="onDragLeave"
           @drop="onDrop"
      >
        
        <div class="expand-icon" @click="toggleExpand">
          <component 
            v-if="element.children && element.children.length > 0"
            :is="element.expanded ? ChevronDown : ChevronRight" 
            :size="14" 
          />
        </div>

        <component :is="ElementIcon" :size="14" class="type-icon" />
        <span v-if="!isRenaming" class="layer-name" @dblclick="startRename">{{ element.name }}</span>
        <input 
          v-else
          ref="renameInput"
          v-model="tempName"
          class="layer-name-input"
          @blur="finishRename"
          @keydown="handleRenameKeydown"
          @click.stop
          @mousedown.stop
        />
        
        <div class="layer-actions">
          <button class="action-btn" @click="toggleLock" :title="element.locked ? 'Unlock' : 'Lock'">
            <component :is="element.locked ? Lock : Unlock" :size="12" />
          </button>
          <button class="action-btn" @click="toggleVisible" :title="element.visible ? 'Hide' : 'Show'">
            <component :is="element.visible ? Eye : EyeOff" :size="12" />
          </button>
          <button class="action-btn delete-btn" @click="removeElement" title="Delete">
            <Trash2 :size="12" />
          </button>
        </div>
      </div>
      
      <!-- Drop indicator line - after -->
      <div v-if="dropPosition === 'after'" class="drop-indicator after"></div>
    </div>

    <div v-if="element.expanded && element.children && element.children.length > 0">
      <LayerTree 
        v-for="child in element.children" 
        :key="child.id" 
        :element="child" 
        :depth="depthLevel + 1" 
      />
    </div>
  </div>
</template>

<style scoped>
.layer-node {
  position: relative;
}

.layer-node.dragging {
  opacity: 0.5;
}

.layer-row-wrapper {
  position: relative;
}

.layer-row {
  display: flex;
  align-items: center;
  height: 32px;
  cursor: pointer;
  color: #cccccc;
  font-size: 13px;
  user-select: none;
  transition: background-color 0.1s;
  padding-right: 8px;
  position: relative;
}

.layer-row:hover {
  background-color: #2a2d2e;
}

.layer-row:hover .layer-actions {
  opacity: 1;
}

.layer-row.selected {
  background-color: #094771;
  color: white;
}

.layer-row.drop-target-inside {
  background-color: #0e639c;
  outline: 2px solid #007acc;
  outline-offset: -2px;
}

.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #007acc;
  z-index: 100;
  pointer-events: none;
}

.drop-indicator::before {
  content: '';
  position: absolute;
  left: 0;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #007acc;
}

.drop-indicator.before {
  top: 0;
}

.drop-indicator.after {
  bottom: 0;
}

.expand-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  cursor: pointer;
}

.expand-icon:hover {
  color: #fff;
}

.type-icon {
  margin-right: 8px;
  opacity: 0.7;
}

.layer-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 8px;
}

.layer-name-input {
  flex: 1;
  margin-right: 8px;
  background: #3c3c3c;
  border: 1px solid #007acc;
  color: #cccccc;
  padding: 2px 4px;
  font-size: 13px;
  outline: none;
  border-radius: 2px;
}

.layer-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.layer-row.selected .layer-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  border-radius: 4px;
}

.action-btn:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.1);
}

.delete-btn:hover {
  color: #ff6b6b;
}
</style>
