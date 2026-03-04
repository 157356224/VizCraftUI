<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../../stores/editor';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Plus, Trash2 } from 'lucide-vue-next';

const store = useEditorStore();

const selectedElement = computed(() => {
  if (store.selectedElementIds.length === 1) {
    const selectedId = store.selectedElementIds[0];
    if (selectedId) {
      return store.findElement(store.elements, selectedId);
    }
  }
  return null;
});

const isTextElement = computed(() => selectedElement.value?.type === 'text');
const isCarouselElement = computed(() => selectedElement.value?.type === 'carousel');

function updateProp(key: string, value: any) {
  if (!selectedElement.value) return;
  store.updateElement(selectedElement.value.id, { [key]: value });
}

function updateStyle(key: string, value: any) {
  if (!selectedElement.value) return;
  store.updateElementStyle(selectedElement.value.id, { [key]: value });
}

// Carousel helpers
function addCarouselImage() {
  if (!selectedElement.value || !selectedElement.value.images) return;
  const newImages = [...selectedElement.value.images, 'https://via.placeholder.com/300x200/cccccc/969696?text=New+Slide'];
  store.updateElement(selectedElement.value.id, { images: newImages });
}

function removeCarouselImage(index: number) {
  if (!selectedElement.value || !selectedElement.value.images) return;
  const newImages = [...selectedElement.value.images];
  newImages.splice(index, 1);
  store.updateElement(selectedElement.value.id, { images: newImages });
  
  // Adjust current index if needed
  if (selectedElement.value.currentIndex && selectedElement.value.currentIndex >= newImages.length) {
    store.updateElement(selectedElement.value.id, { currentIndex: Math.max(0, newImages.length - 1) });
  }
}

function updateCarouselImage(index: number, url: string) {
  if (!selectedElement.value || !selectedElement.value.images) return;
  const newImages = [...selectedElement.value.images];
  newImages[index] = url;
  store.updateElement(selectedElement.value.id, { images: newImages });
}

// Helper to get numeric value from style (e.g. "10px" -> 10)
function getStyleNum(key: string) {
  const val = selectedElement.value?.style[key];
  return parseFloat(val) || 0;
}

// Add mouse drag interaction for labels
function handleLabelDrag(e: MouseEvent, key: string, isStyle = false, scale = 1) {
  e.preventDefault(); // Prevent text selection
  const startX = e.clientX;
  // Get initial value
  let startValue = 0;
  if (isStyle) {
    if (key === 'opacity') {
      startValue = ((selectedElement.value?.style.opacity ?? 1) * 100);
    } else {
      startValue = getStyleNum(key);
    }
  } else {
    // @ts-ignore
    startValue = selectedElement.value?.[key] || 0;
  }

  const handleMouseMove = (me: MouseEvent) => {
    me.preventDefault(); // Prevent selection while dragging
    const dx = me.clientX - startX;
    const newValue = Math.round(startValue + dx * scale);
    
    if (isStyle) {
      if (key === 'opacity') {
        updateStyle('opacity', Math.max(0, Math.min(100, newValue)) / 100);
      } else if (key.includes('Radius')) {
        const pxValue = Math.max(0, newValue) + 'px';
        
        if (key === 'borderRadius') {
           // When dragging main radius, update ALL corners
           updateStyle('borderRadius', pxValue);
           updateStyle('borderTopLeftRadius', pxValue);
           updateStyle('borderTopRightRadius', pxValue);
           updateStyle('borderBottomRightRadius', pxValue);
           updateStyle('borderBottomLeftRadius', pxValue);
        } else {
           // When dragging specific corner, update ONLY that corner
           updateStyle(key, pxValue);
        }
      } else {
        updateStyle(key, newValue);
      }
    } else {
      updateProp(key, newValue);
    }
  };

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = ''; // Re-enable selection
  };

  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none'; // Disable selection globally
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

function openColorPicker(e: MouseEvent) {
  const input = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
  if (input) {
    // Some browsers need a slight delay or focus
    input.focus();
    input.click();
  }
}
</script>

<template>
  <div class="property-panel" v-if="selectedElement" @mousedown.stop>
    <div class="panel-section">
      <div class="section-title">位置</div>
      
      <!-- Coordinates & Rotation -->
      <div class="row grid-2">
        <div class="input-group">
          <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'x')">X</span>
          <input type="number" :value="Math.round(selectedElement.x)" @change="e => updateProp('x', +(e.target as HTMLInputElement).value)" />
        </div>
        <div class="input-group">
          <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'y')">Y</span>
          <input type="number" :value="Math.round(selectedElement.y)" @change="e => updateProp('y', +(e.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="row">
        <div class="input-group">
          <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'rotation')">旋转</span>
          <input type="number" :value="selectedElement.rotation" @change="e => updateProp('rotation', +(e.target as HTMLInputElement).value)" />
          <span class="unit">°</span>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">布局</div>
      <div class="row grid-2">
        <div class="input-group">
          <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'width')">W</span>
          <input type="number" :value="Math.round(selectedElement.width)" @change="e => updateProp('width', +(e.target as HTMLInputElement).value)" />
        </div>
        <div class="input-group">
          <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'height')">H</span>
          <input type="number" :value="Math.round(selectedElement.height)" @change="e => updateProp('height', +(e.target as HTMLInputElement).value)" />
        </div>
      </div>
    </div>

    <!-- Carousel Settings -->
    <div class="panel-section" v-if="isCarouselElement">
      <div class="section-title">轮播设置</div>
      
      <div class="row">
        <div class="input-group">
          <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'interval')">间隔 (ms)</span>
          <input type="number" :value="selectedElement.interval || 3000" @change="e => updateProp('interval', +(e.target as HTMLInputElement).value)" step="100" min="500" />
        </div>
      </div>
      
      <div class="section-subtitle" style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
        <span>图片列表</span>
        <button class="icon-btn" @click="addCarouselImage" title="添加图片"><Plus :size="14" /></button>
      </div>
      
      <div class="image-list">
        <div v-for="(img, index) in selectedElement.images" :key="index" class="image-item">
          <div class="image-preview" :style="{ backgroundImage: `url(${img})` }"></div>
          <input 
            type="text" 
            class="image-url-input" 
            :value="img" 
            @change="e => updateCarouselImage(index, (e.target as HTMLInputElement).value)"
            placeholder="Image URL"
          />
          <button class="icon-btn danger" @click="removeCarouselImage(index)" title="删除"><Trash2 :size="14" /></button>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">外观</div>
      
      <!-- Opacity -->
      <div class="row">
        <div class="input-group">
          <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'opacity', true)">不透明度</span>
          <input type="number" min="0" max="100" :value="((selectedElement.style.opacity ?? 1) * 100)" @change="e => updateStyle('opacity', +(e.target as HTMLInputElement).value / 100)" />
          <span class="unit">%</span>
        </div>
      </div>

      <!-- Typography (Only for Text) -->
      <div v-if="isTextElement" class="typography-group">
        <div class="row">
          <div class="input-group">
            <span class="label">字体</span>
            <select :value="selectedElement.style.fontFamily || 'Arial'" @change="e => updateStyle('fontFamily', (e.target as HTMLSelectElement).value)" class="font-select">
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
              <option value="Palatino">Palatino</option>
              <option value="Garamond">Garamond</option>
              <option value="Bookman">Bookman</option>
              <option value="Comic Sans MS">Comic Sans MS</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
              <option value="Arial Black">Arial Black</option>
              <option value="Impact">Impact</option>
            </select>
          </div>
        </div>

        <div class="row grid-2">
          <div class="input-group">
            <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'fontSize', true)">大小</span>
            <input type="number" :value="getStyleNum('fontSize')" @change="e => updateStyle('fontSize', +(e.target as HTMLInputElement).value)" />
          </div>
          <div class="input-group">
            <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'lineHeight', true, 0.1)">行高</span>
            <input type="number" step="0.1" :value="getStyleNum('lineHeight')" @change="e => updateStyle('lineHeight', +(e.target as HTMLInputElement).value)" />
          </div>
        </div>

        <div class="row">
          <div class="input-group">
            <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'letterSpacing', true)">字距</span>
            <input type="number" :value="getStyleNum('letterSpacing')" @change="e => updateStyle('letterSpacing', +(e.target as HTMLInputElement).value)" />
          </div>
        </div>

        <div class="row align-buttons">
          <button class="icon-btn" :class="{ active: selectedElement.style.textAlign === 'left' }" @click="updateStyle('textAlign', 'left')" title="左对齐"><AlignLeft :size="14" /></button>
          <button class="icon-btn" :class="{ active: selectedElement.style.textAlign === 'center' }" @click="updateStyle('textAlign', 'center')" title="居中对齐"><AlignCenter :size="14" /></button>
          <button class="icon-btn" :class="{ active: selectedElement.style.textAlign === 'right' }" @click="updateStyle('textAlign', 'right')" title="右对齐"><AlignRight :size="14" /></button>
          <button class="icon-btn" :class="{ active: selectedElement.style.textAlign === 'justify' }" @click="updateStyle('textAlign', 'justify')" title="两端对齐"><AlignJustify :size="14" /></button>
        </div>
      </div>

      <!-- Border Radius -->
      <div v-if="!isTextElement">
        <div class="row">
          <div class="input-group">
            <span class="label draggable" @mousedown="e => handleLabelDrag(e, 'borderRadius', true)">圆角</span>
            <input type="number" :value="getStyleNum('borderRadius')" @change="e => {
              const val = (e.target as HTMLInputElement).value + 'px';
              updateStyle('borderRadius', val);
              updateStyle('borderTopLeftRadius', val);
              updateStyle('borderTopRightRadius', val);
              updateStyle('borderBottomRightRadius', val);
              updateStyle('borderBottomLeftRadius', val);
            }" placeholder="0" />
          </div>
        </div>
        
        <!-- Independent Corners -->
        <div class="radius-grid">
           <div class="input-group small">
             <input type="number" :value="getStyleNum('borderTopLeftRadius')" @change="e => updateStyle('borderTopLeftRadius', +(e.target as HTMLInputElement).value + 'px')" placeholder="TL" />
           </div>
           <div class="input-group small">
             <input type="number" :value="getStyleNum('borderTopRightRadius')" @change="e => updateStyle('borderTopRightRadius', +(e.target as HTMLInputElement).value + 'px')" placeholder="TR" />
           </div>
           <div class="input-group small">
             <input type="number" :value="getStyleNum('borderBottomRightRadius')" @change="e => updateStyle('borderBottomRightRadius', +(e.target as HTMLInputElement).value + 'px')" placeholder="BR" />
           </div>
           <div class="input-group small">
             <input type="number" :value="getStyleNum('borderBottomLeftRadius')" @change="e => updateStyle('borderBottomLeftRadius', +(e.target as HTMLInputElement).value + 'px')" placeholder="BL" />
           </div>
        </div>
      </div>

      <!-- Fill -->
      <div class="row fill-row">
        <div class="section-subtitle">填充</div>
        <div class="color-picker-wrapper">
          <div class="color-preview" 
               :style="{ backgroundColor: selectedElement.style.fill || 'transparent' }"
               @click="openColorPicker"></div>
          <input type="color" :value="selectedElement.style.fill || '#ffffff'" @input="e => updateStyle('fill', (e.target as HTMLInputElement).value)" @change="e => updateStyle('fill', (e.target as HTMLInputElement).value)" />
          <input type="text" class="color-hex" :value="selectedElement.style.fill" @change="e => updateStyle('fill', (e.target as HTMLInputElement).value)" />
        </div>
      </div>
    </div>
  </div>
  <div class="property-panel empty" v-else>
    <div class="empty-text">未选择图层</div>
  </div>
</template>

<style scoped>
.property-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  color: #e0e0e0;
  overflow-y: auto;
}

.property-panel.empty {
  align-items: center;
  justify-content: center;
}

.empty-text {
  color: #666;
  font-size: 13px;
}

.panel-section {
  margin-bottom: 24px;
  border-bottom: 1px solid #333;
  padding-bottom: 16px;
}

.panel-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #888;
  text-transform: uppercase;
}

.section-subtitle {
  font-size: 12px;
  margin-bottom: 8px;
  color: #ccc;
}

.row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.align-buttons {
  justify-content: space-between;
  margin-bottom: 16px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #ccc;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background-color: #333;
  color: white;
}

.icon-btn.active {
  background-color: #007acc;
  color: white;
}

.rotate-90 {
  transform: rotate(90deg);
}

.font-select {
  background: transparent;
  border: none;
  color: #eee;
  width: 100%;
  font-size: 12px;
  outline: none;
  padding: 4px 0;
  appearance: none; /* Hide default arrow if possible or custom style */
  cursor: pointer;
}

.font-select option {
  background-color: #2c2c2c;
  color: #eee;
}

.input-group {
  display: flex;
  align-items: center;
  background-color: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
  flex: 1;
}

.input-group:focus-within {
  border-color: #007acc;
}

.input-group .label {
  font-size: 11px;
  color: #888;
  margin-right: 8px;
  min-width: auto;
  flex-shrink: 0;
  white-space: nowrap;
  user-select: none; /* Prevent text selection */
}

.input-group .label.draggable {
  cursor: ew-resize;
}

.input-group .label.draggable:hover {
  color: #007acc;
}

.input-group input {
  background: transparent;
  border: none;
  color: #eee;
  width: 100%;
  font-size: 12px;
  outline: none;
  padding: 4px 0;
}

.input-group .unit {
  font-size: 11px;
  color: #666;
  margin-left: 4px;
}

.radius-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.input-group.small {
  padding: 0 4px;
}

.input-group.small input {
  text-align: center;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #444;
}

input[type="color"] {
  width: 1px;
  height: 1px;
  opacity: 0;
  padding: 0;
  border: 0;
  position: absolute;
  clip: rect(0 0 0 0);
  pointer-events: none;
}

.color-hex {
    background: #1e1e1e;
    border: 1px solid #333;
    color: #eee;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    width: 80px;
  }
  
  /* Carousel */
  .image-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }
  
  .image-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #252526;
    padding: 4px;
    border-radius: 4px;
  }
  
  .image-preview {
    width: 32px;
    height: 24px;
    background-size: cover;
    background-position: center;
    border-radius: 2px;
    background-color: #333;
  }
  
  .image-url-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #ccc;
    font-size: 11px;
    outline: none;
    min-width: 0;
  }
  
  .icon-btn.danger:hover {
    color: #ff4d4f;
    background-color: rgba(255, 77, 79, 0.1);
  }
  </style>
