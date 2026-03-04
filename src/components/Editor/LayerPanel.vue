<script setup lang="ts">
import { useEditorStore } from '../../stores/editor';
import LayerTree from './LayerTree.vue';

const store = useEditorStore();
</script>

<template>
  <div class="layer-panel">
    <div class="panel-header">
      图层
    </div>
    <div class="panel-content">
      <LayerTree 
        v-for="element in store.elements" 
        :key="element.id" 
        :element="element" 
      />
    </div>
  </div>
</template>

<style scoped>
.layer-panel {
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
  padding: 8px 0;
}

/* Scrollbar styling */
.panel-content::-webkit-scrollbar {
  width: 8px;
}

.panel-content::-webkit-scrollbar-thumb {
  background-color: #424242;
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
