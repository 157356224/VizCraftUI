<script setup lang="ts">
import { ref } from 'vue';
import { Layers, Box } from 'lucide-vue-next';

const activeTab = ref<'layers' | 'assets'>('layers');

const emit = defineEmits<{
  (e: 'change', tab: 'layers' | 'assets'): void;
}>();

function selectTab(tab: 'layers' | 'assets') {
  activeTab.value = tab;
  emit('change', tab);
}
</script>

<template>
  <div class="sidebar">
    <div 
      class="sidebar-item" 
      :class="{ active: activeTab === 'layers' }"
      @click="selectTab('layers')"
      title="图层"
    >
      <Layers :size="20" />
      <span class="label">图层</span>
    </div>
    <div 
      class="sidebar-item" 
      :class="{ active: activeTab === 'assets' }"
      @click="selectTab('assets')"
      title="组件"
    >
      <Box :size="20" />
      <span class="label">组件</span>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 60px;
  background-color: #333333;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
  border-right: 1px solid #444;
  position: relative;
  z-index: 20;
}

.sidebar-item {
  width: 50px;
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #888;
  transition: all 0.2s;
  gap: 4px;
}

.sidebar-item:hover {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.1);
}

.sidebar-item.active {
  color: #fff;
  background-color: #007acc;
}

.label {
  font-size: 10px;
  line-height: 1;
}
</style>
