<script setup lang="ts">
import { useEditorStore } from '../../stores/editor';
import { Square, Type, Image as ImageIcon, Layout, Box, GalleryHorizontal } from 'lucide-vue-next';

const store = useEditorStore();

const basicComponents = [
  { type: 'rect', name: '矩形', icon: Square },
  { type: 'text', name: '文本', icon: Type },
  { type: 'image', name: '图片', icon: ImageIcon },
  { type: 'frame', name: '画框', icon: Layout },
  { type: 'carousel', name: '轮播图', icon: GalleryHorizontal },
];

function addComponent(type: string) {
  // Center of the canvas (approximate)
  const x = -store.offset.x / store.scale + 100;
  const y = -store.offset.y / store.scale + 100;
  
  const id = `${type}-${Date.now()}`;
  
  if (type === 'rect') {
    store.addElement({
      id,
      name: `矩形 ${store.elements.length + 1}`,
      type: 'rect',
      x, y,
      width: 100,
      height: 100,
      rotation: 0,
      visible: true,
      locked: false,
      expanded: false,
      children: [],
      style: { fill: '#d9d9d9', opacity: 1 }
    });
  } else if (type === 'text') {
    store.addElement({
      id,
      name: `文本 ${store.elements.length + 1}`,
      type: 'text',
      x, y,
      width: 100,
      height: 30,
      rotation: 0,
      visible: true,
      locked: false,
      expanded: false,
      children: [],
      content: '文本',
      style: { fill: '#000000', fontSize: 16, fontFamily: 'Arial', opacity: 1 }
    });
  } else if (type === 'frame') {
    store.addElement({
      id,
      name: `画框 ${store.elements.length + 1}`,
      type: 'frame',
      x, y,
      width: 375,
      height: 667,
      rotation: 0,
      visible: true,
      locked: false,
      expanded: true,
      children: [],
      style: { fill: '#ffffff', opacity: 1 }
    });
  } else if (type === 'image') {
    alert('请直接拖拽图片到画布');
    return;
  } else if (type === 'carousel') {
    store.addElement({
      id,
      name: `轮播图 ${store.elements.length + 1}`,
      type: 'carousel',
      x, y,
      width: 300,
      height: 200,
      rotation: 0,
      visible: true,
      locked: false,
      expanded: false,
      children: [],
      images: [
        'https://via.placeholder.com/300x200/cccccc/969696?text=Slide+1',
        'https://via.placeholder.com/300x200/aaaaaa/666666?text=Slide+2',
        'https://via.placeholder.com/300x200/888888/333333?text=Slide+3'
      ],
      currentIndex: 0,
      style: { opacity: 1 }
    });
  }
  
  if (type !== 'image') {
    store.selectElement(id);
  }
}

function handleDragStart(e: DragEvent, type: string) {
  e.dataTransfer?.setData('application/vizcraft-component', type);
  e.dataTransfer!.effectAllowed = 'copy';
}
</script>

<template>
  <div class="assets-panel">
    <div class="panel-header">
      基础组件
    </div>
    <div class="panel-content">
      <div class="component-grid">
        <div 
          v-for="item in basicComponents" 
          :key="item.type"
          class="component-item"
          draggable="true"
          @dragstart="handleDragStart($event, item.type)"
          @click="addComponent(item.type)"
        >
          <div class="icon-wrapper">
            <component :is="item.icon" :size="24" />
          </div>
          <span class="component-name">{{ item.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assets-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #333;
  font-weight: 600;
  font-size: 12px;
  color: #eeeeee;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.component-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.component-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #333;
  border-radius: 6px;
  padding: 16px 8px;
  cursor: grab;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.component-item:hover {
  background-color: #444;
  border-color: #666;
  transform: translateY(-2px);
}

.component-item:active {
  cursor: grabbing;
}

.icon-wrapper {
  margin-bottom: 8px;
  color: #ccc;
}

.component-name {
  font-size: 12px;
  color: #aaa;
}
</style>
