<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useEditorStore } from '../../stores/editor';
import { 
  MousePointer2, Hand, Maximize, 
  Layout, Crop, 
  Square, 
  PenTool, Pencil,
  Type,
  ChevronDown,
  Download
} from 'lucide-vue-next';

const store = useEditorStore();
const activeDropdown = ref<string | null>(null);

function exportCurrentFrame() {
  if (store.selectedElementIds.length !== 1) {
    alert('请选择一个画框进行导出');
    return;
  }
  
  const selectedId = store.selectedElementIds[0];
  if (!selectedId) {
    alert('请选择一个画框进行导出');
    return;
  }
  
  const element = store.findElement(store.elements, selectedId);
  if (!element || element.type !== 'frame') {
    alert('请选择一个画框进行导出');
    return;
  }
  
  const code = store.exportToUVUE(element);
  
  // Create blob and download
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${element.name}.uvue`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const toolGroups = [
  {
    id: 'move',
    name: '移动工具',
    items: [
      { id: 'move', name: '移动', icon: MousePointer2, shortcut: 'V' },
      { id: 'hand', name: '抓手工具', icon: Hand, shortcut: 'H' },
      { id: 'scale', name: '缩放', icon: Maximize, shortcut: 'K' },
    ]
  },
  {
    id: 'region',
    name: '区域工具',
    items: [
      { id: 'frame', name: '画框', icon: Layout, shortcut: 'F' },
      { id: 'slice', name: '切片', icon: Crop, shortcut: 'S' },
    ]
  },
  {
    id: 'shape',
    name: '形状工具',
    items: [
      { id: 'rect', name: '矩形', icon: Square, shortcut: 'R' },
    ]
  },
  {
    id: 'create',
    name: '创作工具',
    items: [
      { id: 'pen', name: '钢笔', icon: PenTool, shortcut: 'P' },
      { id: 'pencil', name: '铅笔', icon: Pencil, shortcut: 'Shift+P' },
    ]
  },
  {
    id: 'text',
    name: '文本工具',
    items: [
      { id: 'text', name: '文本', icon: Type, shortcut: 'T' },
    ]
  }
];

function toggleDropdown(groupId: string) {
  if (activeDropdown.value === groupId) {
    activeDropdown.value = null;
  } else {
    activeDropdown.value = groupId;
  }
}

function selectTool(group: any, tool: any) {
  store.setTool(group.id, tool.id);
  activeDropdown.value = null;
}

function getActiveTool(group: any) {
  if (store.currentTool === group.id) {
    const tool = group.items.find((t: any) => t.id === store.currentSubTool);
    return tool || group.items[0];
  }
  return group.items[0];
}

function getActiveToolSafe(group: any) {
  const tool = getActiveTool(group);
  return tool || group.items[0]; // Fallback to first item
}

function getActiveToolIcon(group: any) {
  // If the current store tool is in this group, return that tool's icon
  // Otherwise return the first tool's icon
  if (store.currentTool === group.id) {
    const tool = group.items.find((t: any) => t.id === store.currentSubTool);
    return tool ? tool.icon : group.items[0].icon;
  }
  return group.items[0].icon;
}

function isGroupActive(group: any) {
  return store.currentTool === group.id;
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.tool-group')) {
    activeDropdown.value = null;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="toolbar">
    <div 
      v-for="group in toolGroups" 
      :key="group.id" 
      class="tool-group"
      :class="{ active: isGroupActive(group) }"
    >
      <div class="tool-main" @click="selectTool(group, getActiveToolSafe(group))">
        <component :is="getActiveToolIcon(group)" :size="20" />
      </div>
      <div class="tool-arrow" @click.stop="toggleDropdown(group.id)">
        <ChevronDown :size="12" />
      </div>

      <div v-if="activeDropdown === group.id" class="tool-dropdown">
        <div 
          v-for="tool in group.items" 
          :key="tool.id" 
          class="dropdown-item"
          :class="{ active: store.currentSubTool === tool.id }"
          @click.stop="selectTool(group, tool)"
        >
          <component :is="tool.icon" :size="16" />
          <span class="tool-name">{{ tool.name }}</span>
          <span class="tool-shortcut" v-if="tool.shortcut">{{ tool.shortcut }}</span>
        </div>
      </div>
    </div>
    
    <!-- Export Button -->
    <div class="tool-group" @click="exportCurrentFrame" title="导出选中画框为 index.uvue">
       <div class="tool-main">
          <Download :size="20" />
       </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  background-color: #2c2c2c;
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid #444;
}

.tool-group {
  display: flex;
  align-items: center;
  border-radius: 4px;
  position: relative;
  color: #ccc;
  transition: background-color 0.2s;
}

.tool-group:hover {
  background-color: #3e3e3e;
}

.tool-group.active {
  background-color: #007acc; /* Blue active state */
  color: white;
}

.tool-main {
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.tool-arrow {
  padding: 8px 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  opacity: 0.7;
}

.tool-arrow:hover {
  background-color: rgba(255, 255, 255, 0.1);
  opacity: 1;
}

.tool-dropdown {
  position: absolute;
  bottom: 100%; /* Show above */
  left: 0;
  margin-bottom: 8px;
  background-color: #2c2c2c;
  border: 1px solid #444;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  min-width: 150px;
  z-index: 100;
  padding: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #ccc;
  gap: 8px;
}

.dropdown-item:hover {
  background-color: #007acc;
  color: white;
}

.dropdown-item.active {
  color: #007acc;
}

.dropdown-item.active:hover {
  color: white;
}

.tool-name {
  flex: 1;
}

.tool-shortcut {
  opacity: 0.5;
  font-size: 11px;
}
</style>
