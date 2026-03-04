<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import EditorLayout from './components/Editor/EditorLayout.vue'

// Prevent browser default keyboard shortcuts
function handleGlobalKeyDown(e: KeyboardEvent) {
  // Allow F12 (DevTools) and F5/Ctrl+R (Refresh) for development convenience unless explicitly asked to block
  // But user said "only let my web page listen", implying a strong block.
  // Let's block common disruptive shortcuts.

  // Block Ctrl+S (Save), Ctrl+P (Print), Ctrl+F (Find), Ctrl+G (Find Next), etc.
  // Also blocking Refresh (Ctrl+R, F5) to prevent accidental data loss, though browser support varies.
  if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'f', 'g', 'o', 'u', 'h', 'r', 'j'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }

  // Block F1, F3, F5, F7, F11(Fullscreen handled by app?), F12(DevTools)
  if (['F1', 'F3', 'F5', 'F7'].includes(e.key)) {
    e.preventDefault();
  }

  // Block Alt+Left/Right (History navigation) if not in an input
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>

<template>
  <EditorLayout />
</template>

<style>
* {
  /* cursor: url('/指针.cur'), auto !important; */
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #1e1e1e; /* Dark theme background */
  color: #e0e0e0;
  font-family: 'Inter', sans-serif;
}
</style>
