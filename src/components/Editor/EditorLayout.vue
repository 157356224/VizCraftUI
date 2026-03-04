<script setup lang="ts">
import LayerPanel from './LayerPanel.vue';
import InfiniteCanvas from './InfiniteCanvas.vue';
import Toolbar from './Toolbar.vue';
import PropertyPanel from './PropertyPanel.vue';
</script>

<template>
  <div class="editor-layout">
    <div class="left-panel">
      <LayerPanel />
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

.left-panel {
  width: 240px;
  background-color: #252526;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  z-index: 10;
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
