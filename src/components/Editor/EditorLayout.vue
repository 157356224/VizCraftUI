<script setup lang="ts">
import { ref } from 'vue';
import LayerPanel from './LayerPanel.vue';
import AssetsPanel from './AssetsPanel.vue';
import Sidebar from './Sidebar.vue';
import InfiniteCanvas from './InfiniteCanvas.vue';
import Toolbar from './Toolbar.vue';
import PropertyPanel from './PropertyPanel.vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const activeLeftPanel = ref<'layers' | 'assets'>('layers');
const isLeftPanelCollapsed = ref(false);

function toggleCollapse() {
  isLeftPanelCollapsed.value = !isLeftPanelCollapsed.value;
}
</script>

<template>
  <div class="editor-layout">
    <Sidebar @change="(tab) => { activeLeftPanel = tab; isLeftPanelCollapsed = false; }" />
    <div class="left-panel-wrapper" :class="{ collapsed: isLeftPanelCollapsed }">
      <div class="left-panel">
        <AssetsPanel v-show="activeLeftPanel === 'assets'" />
        <LayerPanel v-show="activeLeftPanel === 'layers'" />
      </div>
      
      <!-- Collapse Button -->
      <div class="collapse-btn" @click="toggleCollapse" :title="isLeftPanelCollapsed ? '展开' : '收起'">
        <ChevronRight v-if="isLeftPanelCollapsed" :size="14" />
        <ChevronLeft v-else :size="14" />
      </div>
    </div>
    <div class="main-area">
      <InfiniteCanvas />
    </div>
    <div class="right-panel">
      <PropertyPanel />
    </div>
    <div class="bottom-bar">
      <Toolbar />
    </div>
  </div>
</template>

<style scoped>
.editor-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: #1e1e1e;
  overflow: hidden;
  position: relative;
}

.left-panel-wrapper {
  position: absolute; /* Changed to absolute to float over canvas */
  left: 60px; /* Offset by sidebar width */
  top: 0;
  bottom: 0;
  display: flex;
  height: 100%;
  transition: transform 0.3s ease;
  width: 240px;
  background-color: #252526;
  border-right: 1px solid #333;
  z-index: 10;
  transform: translateX(0);
}

.left-panel-wrapper.collapsed {
  transform: translateX(-100%);
  border-right: none;
}

.left-panel {
  width: 240px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.collapse-btn {
  position: absolute;
  top: 50%;
  right: -12px; /* Position half outside */
  transform: translateY(-50%);
  width: 12px; /* Half width */
  height: 48px; /* Taller */
  background-color: #252526; /* Match panel bg */
  border: 1px solid #333;
  border-left: none; /* Remove left border to blend */
  border-top-right-radius: 12px; /* Round corners on right side */
  border-bottom-right-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #888;
  z-index: 20;
  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.collapse-btn:hover {
  background-color: #333;
  color: white;
}

.left-panel-wrapper.collapsed .collapse-btn {
  right: -12px; /* Keep it visible */
  background-color: #333; /* Darker when collapsed */
}

.right-panel {
  width: 280px;
  background-color: #252526;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.main-area {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.bottom-bar {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none; /* Let clicks pass through the container area */
}

/* Ensure the toolbar itself captures events */
.bottom-bar > * {
  pointer-events: auto;
}
</style>
