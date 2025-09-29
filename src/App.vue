<script setup lang="ts">
import ChatPanel from './components/ChatPanel.vue'
import TreePanel from './components/TreePanel.vue'
</script>

<template>
  <div class="container">
    <div class="left">
      <ChatPanel />
    </div>
    <div class="right">
      <TreePanel />
    </div>
  </div>
</template>

<style scoped>
.container { display: grid; grid-template-columns: 1fr 1fr; height: 100vh; }
.left { border-right: 1px solid #e5e7eb; overflow: hidden; }
.right { overflow: auto; }
</style>





