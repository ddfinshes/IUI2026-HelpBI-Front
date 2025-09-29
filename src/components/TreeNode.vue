<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  node: any
  nodesMap: Record<string, any>
}>()

// 子节点数组
const childrenNodes = computed(() => {
  if (!props.node.next_node) return []
  return props.node.next_node
    .filter(id => id !== 'None')
    .map(id => props.nodesMap[id])
    .filter(Boolean)
})

// 控制展示模式（表格/图表）
const viewMode = ref<'table' | 'chart'>('table')
const toggleView = () => {
  viewMode.value = viewMode.value === 'table' ? 'chart' : 'table'
}
</script>

<template>
  <li>
    <div class="node">
      <!-- 标题 -->
      <h3 class="title">{{ node.id }}</h3>

      <!-- 自然语言解释 -->
      <div class="nl">{{ node.NL }}</div>

      <!-- 展示区：按钮切换表格 / 图表 -->
      <div class="view-toggle" v-if="node.Table || node.Chart">
        <button @click="toggleView">
          Switch to {{ viewMode === 'table' ? 'Chart' : 'Table' }}
        </button>
      </div>

      <!-- 表格模式 -->
      <div v-if="viewMode === 'table'" class="data-table">
        <div v-if="node.Table">
          <div class="table-desc">{{ node.Table.desc }}</div>
          <table v-if="node.Table.data && node.Table.data.length" class="df-table">
            <thead>
              <tr>
                <th v-for="(col, ci) in node.Table.data[0]" :key="ci">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in node.Table.data.slice(1)" :key="ri">
                <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-table">无数据</div>
        </div>
      </div>

      <!-- 图表模式 -->
      <div v-else class="data-chart">
        <div v-if="node.Chart">
          <div class="chart-desc">{{ node.Chart.desc }}</div>
          <!-- Chart 占位，以后接入 ECharts -->
          <div class="chart-placeholder">[ {{ node.Chart.type }} chart for {{ node.id }} ]</div>
        </div>
        <div v-else class="no-chart">该节点没有图表</div>
      </div>
    </div>

    <!-- 子节点 -->
    <ul v-if="childrenNodes.length">
      <TreeNode
        v-for="child in childrenNodes"
        :key="child.id"
        :node="child"
        :nodes-map="nodesMap"
      />
    </ul>
  </li>
</template>

<style scoped>
.node {
  padding: 12px 16px;
  border-radius: 10px;
  background: #f9fafb;
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 6px;
  color: #2d3748;
}
.nl {
  font-size: 14px;
  margin-bottom: 10px;
  color: #4a5568;
}
.view-toggle {
  margin-bottom: 8px;
}
.view-toggle button {
  padding: 4px 10px;
  font-size: 13px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}
.data-table, .data-chart {
  padding: 8px;
  background: #edf2f7;
  border-radius: 6px;
  font-size: 13px;
  min-height: 60px;
}
.table-desc, .chart-desc {
  font-size: 12px;
  color: #4a5568;
  margin-bottom: 6px;
}
.df-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.df-table th, .df-table td {
  border: 1px solid #cbd5e0;
  padding: 4px 6px;
  text-align: left;
}
.df-table th {
  background: #e2e8f0;
  font-weight: 600;
}
.empty-table, .no-chart, .chart-placeholder {
  text-align: center;
  color: #718096;
  font-style: italic;
  padding: 8px;
}
ul {
  list-style: none;
  margin-left: 20px;
  padding-left: 0;
}
</style>
