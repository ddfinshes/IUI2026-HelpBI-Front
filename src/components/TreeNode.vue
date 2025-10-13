<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

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

// 字段编辑状态管理
const editingField = ref<{ nodeId: string; columnIndex: number } | null>(null)
const editingValue = ref('')
const fieldInput = ref<HTMLInputElement | null>(null)

// 存储每个节点的字段名称修改
const fieldNames = reactive<Record<string, string[]>>({})

// 从本地存储加载字段名称
const loadFieldNames = () => {
  try {
    const saved = localStorage.getItem('bi-field-names')
    if (saved) {
      const parsed = JSON.parse(saved)
      Object.assign(fieldNames, parsed)
    }
  } catch (error) {
    console.warn('Failed to load field names from localStorage:', error)
  }
}

// 保存字段名称到本地存储
const saveFieldNamesToStorage = () => {
  try {
    localStorage.setItem('bi-field-names', JSON.stringify(fieldNames))
  } catch (error) {
    console.warn('Failed to save field names to localStorage:', error)
  }
}

// 初始化时加载保存的字段名称
loadFieldNames()

// 获取字段名称（优先使用修改后的名称）
const getFieldName = (nodeId: string, columnIndex: number, originalName: string) => {
  if (fieldNames[nodeId] && fieldNames[nodeId][columnIndex]) {
    return fieldNames[nodeId][columnIndex]
  }
  return originalName
}

// 开始编辑字段
const startEditField = (nodeId: string, columnIndex: number, currentName: string) => {
  editingField.value = { nodeId, columnIndex }
  editingValue.value = currentName
  
  // 在下一个tick中聚焦输入框并选中文本
  setTimeout(() => {
    if (fieldInput.value) {
      fieldInput.value.focus()
      fieldInput.value.select()
    }
  }, 0)
}

// 保存字段名称
const saveFieldName = () => {
  if (!editingField.value) return
  
  const { nodeId, columnIndex } = editingField.value
  
  // 初始化该节点的字段名称数组
  if (!fieldNames[nodeId]) {
    fieldNames[nodeId] = []
  }
  
  // 保存修改后的字段名称
  fieldNames[nodeId][columnIndex] = editingValue.value
  
  // 保存到本地存储
  saveFieldNamesToStorage()
  
  // 结束编辑
  editingField.value = null
  editingValue.value = ''
}

// 取消编辑
const cancelEdit = () => {
  editingField.value = null
  editingValue.value = ''
}

// 检查是否正在编辑某个字段
const isEditingField = (nodeId: string, columnIndex: number) => {
  return editingField.value?.nodeId === nodeId && editingField.value?.columnIndex === columnIndex
}

// 重置字段名称到原始值
const resetFieldName = (nodeId: string, columnIndex: number, originalName: string) => {
  if (fieldNames[nodeId] && fieldNames[nodeId][columnIndex]) {
    delete fieldNames[nodeId][columnIndex]
    // 如果该节点的所有字段都重置了，删除该节点
    if (fieldNames[nodeId].length === 0 || fieldNames[nodeId].every(name => !name)) {
      delete fieldNames[nodeId]
    }
    saveFieldNamesToStorage()
  }
}

// 检查字段是否被修改过
const isFieldModified = (nodeId: string, columnIndex: number) => {
  return fieldNames[nodeId] && fieldNames[nodeId][columnIndex]
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
                <th 
                  v-for="(col, ci) in node.Table.data[0]" 
                  :key="ci"
                  class="editable-header"
                  @click="startEditField(node.id, ci, getFieldName(node.id, ci, col))"
                >
                  <!-- 编辑模式 -->
                  <div v-if="isEditingField(node.id, ci)" class="edit-container">
                    <input 
                      v-model="editingValue"
                      @keyup.enter="saveFieldName"
                      @keyup.escape="cancelEdit"
                      @blur="saveFieldName"
                      class="field-input"
                      :ref="fieldInput"
                    />
                  </div>
                  <!-- 显示模式 -->
                  <div v-else class="field-display">
                    <div class="field-name" :class="{ 'modified': isFieldModified(node.id, ci) }">
                      {{ getFieldName(node.id, ci, col) }}
                    </div>
                    <div class="field-actions">
                      <span class="edit-hint">点击编辑</span>
                      <button 
                        v-if="isFieldModified(node.id, ci)"
                        @click.stop="resetFieldName(node.id, ci, col)"
                        class="reset-btn"
                        title="重置为原始名称"
                      >
                        ↶
                      </button>
                    </div>
                  </div>
                </th>
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

/* 可编辑表头样式 */
.editable-header {
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease;
}

.editable-header:hover {
  background-color: #cbd5e0 !important;
}

.field-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.field-name {
  font-weight: 600;
  transition: color 0.2s ease;
}

.field-name.modified {
  color: #4299e1;
  font-weight: 700;
}

.field-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.edit-hint {
  font-size: 10px;
  color: #718096;
  font-style: italic;
  opacity: 0.7;
}

.reset-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #e53e3e;
  padding: 1px 3px;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.reset-btn:hover {
  background-color: #fed7d7;
}

.edit-container {
  width: 100%;
}

.field-input {
  width: 100%;
  border: 2px solid #4299e1;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12px;
  background: white;
  outline: none;
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
