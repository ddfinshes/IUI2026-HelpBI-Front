<script setup lang="ts">
import { ref, nextTick, onMounted, computed, reactive} from 'vue'
// import sample from '../assests/Example.json'
import { watch } from 'vue'
import { watchEffect } from 'vue'
import ChartViewer from './ChartViewer.vue'
import { useBiStore } from '../store/biStore'

const store = useBiStore()

const flowchartRef = ref<HTMLElement | null>(null)
const svgWidth = ref(800)
const svgHeight = ref(1500)
const links = ref<any[]>([])

const mainline = ref<any[]>([])   // 主线节点
const keywords = ref<any[]>([])   // 关键词节点
const nodesMap = ref<Record<string, any>>({})
const nodeRefs: Record<string, HTMLElement> = {}
const hoveredLink = ref<{ from: string, to: string, condition: string } | null>(null)


// 定义一个原子操作类型列表
const atomicOps = [
  'Filter',
  'Select',
  'GroupBy',
  'Aggregate',
  'Order/Limit',
  'Join',
  'Transform',
  'Window'
]

// 判断是否是原子操作
const isAtomicOp = (type?: string) => {
  return type ? atomicOps.includes(type) : false
}

const viewModes = ref<Record<string, 'table' | 'chart'>>({})
const sample = computed(() => store.state.biResult || { nodes: [], edges: [] })

// 字段编辑状态管理
const editingField = ref<{ nodeId: string; columnIndex: number } | null>(null)
const editingValue = ref('')
const fieldInput = ref<HTMLInputElement>()

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
  console.log('开始编辑字段:', { nodeId, columnIndex, currentName })
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


// sample.nodes.forEach((n: any) => {
//   nodesMap.value[n.id] = n
//   viewModes.value[n.id] = 'table'
// })

function normalizeOperation(op: any) { 
  if (!op) return { type: '', condition: '' }
  const { type, condition } = op

  return {
    type: type || '',
    condition: condition || ''
  }
}

function getOperation(link: any) {
  const toNode = nodesMap.value[link.to]
  return toNode?.operation ? normalizeOperation(toNode.operation) : null
}

async function loadSample() {
  // 首先尝试从store获取数据
  let data = store.state.biResult
  
  // 如果store中没有数据，则加载示例数据
  if (!data || !data.nodes) {
    try {
      const response = await fetch('/src/assests/Example.json')
      data = await response.json()
      // 将数据保存到store中
      store.setBiResult(data)
    } catch (error) {
      console.error('Failed to load sample data:', error)
      return
    }
  }

  if (!data.nodes) return

  nodesMap.value = {}
  viewModes.value = {}

  data.nodes.forEach((n: any) => {
    nodesMap.value[n.id] = n
    viewModes.value[n.id] = 'table'
  })

  // edges -> links（包含 operation 信息）
  links.value = (data.edges || []).map((e: any) => ({
    from: e.from,
    to: e.to,
  }))

  mainline.value = data.nodes.filter((n: any) => n.type !== 'Keyword')
  keywords.value = data.nodes.filter((n: any) => n.type === 'Keyword')

  console.log('Loaded data:', data)
  console.log('Mainline nodes:', mainline.value)
  console.log('Keywords:', keywords.value)

  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateSvgSize()
      })
    })
  })
}

function getNode(link: any) {
  const fromNode = nodesMap.value[link.from]
  return fromNode ? fromNode : null
}

function updateSvgSize() {
  if (flowchartRef.value) {
    const rect = flowchartRef.value.getBoundingClientRect()
    svgWidth.value = rect.width
    svgHeight.value = rect.height
  }
}

// 获取节点中心坐标
function getNodeCenter(id: string) {
  const el = nodeRefs[id]
  if (el && flowchartRef.value) {
    const rect = el.getBoundingClientRect()
    const containerRect = flowchartRef.value.getBoundingClientRect()
    const x = rect.left - containerRect.left + rect.width / 2
    const y = rect.top - containerRect.top + rect.height / 2
    return { x, y }
  }
  return { x: 0, y: 0 }
}

function getPath(link: { from: string, to: string }) {
  const from = getNodeCenter(link.from)
  const to = getNodeCenter(link.to)
  const fromEl = nodeRefs[link.from]
  const toEl = nodeRefs[link.to]
  const containerRect = flowchartRef.value?.getBoundingClientRect() || { left: 0, top: 0 }

  if (!fromEl || !toEl) return ''

  const fromRect = fromEl.getBoundingClientRect()
  const toRect = toEl.getBoundingClientRect()

  // 判断是竖直主线还是横向 keyword
  if (Math.abs(from.x - to.x) < 50) {
    // 竖直：下边缘 → 上边缘
    const startX = from.x
    const startY = fromRect.bottom - containerRect.top
    const endX = to.x
    const endY = toRect.top - containerRect.top
    return `M ${startX},${startY} C ${startX},${(startY+endY)/2} ${endX},${(startY+endY)/2} ${endX},${endY}`
  } else {
    // 横向：右边缘 → 左边缘
    const startX = fromRect.right - containerRect.left
    const startY = from.y
    const endX = toRect.left - containerRect.left
    const endY = to.y
    return `M ${startX},${startY} C ${(startX+endX)/2},${startY} ${(startX+endX)/2},${endY} ${endX},${endY}`
  }
}

function getNodeAnchor(id: string, position: 'top' | 'bottom' | 'left' | 'right') {
  const el = nodeRefs[id]
  if (el && flowchartRef.value) {
    const rect = el.getBoundingClientRect()
    const containerRect = flowchartRef.value.getBoundingClientRect()

    switch (position) {
      case 'top':
        return { x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top + 10}
      case 'bottom':
        return { x: rect.left - containerRect.left + rect.width / 2, y: rect.bottom - containerRect.top + 10}
      case 'left':
        return { x: rect.left - containerRect.left, y: rect.top - containerRect.top + rect.height / 2 }
      case 'right':
        return { x: rect.right - containerRect.left, y: rect.top - containerRect.top + rect.height / 2 }
    }
  }
  return { x: 0, y: 0 }
}

function getLabelPos(link: { from: string, to: string }) {
  const fromEl = nodeRefs[link.from]
  const toEl = nodeRefs[link.to]
  if (!fromEl || !toEl) return { x: 0, y: 0 }

  const fromRect = fromEl.getBoundingClientRect()
  const toRect = toEl.getBoundingClientRect()

  if (Math.abs((fromRect.left + fromRect.width / 2) - (toRect.left + toRect.width / 2)) < 50) {
    // 竖直主线
    const start = getNodeAnchor(link.from, 'bottom')
    const end = getNodeAnchor(link.to, 'top')
    return { x: start.x, y: (start.y + end.y) / 2 - 6 }
  } else {
    // 横向 keyword
    const startX = getNodeAnchor(link.from, 'right').x
    const endX = getNodeAnchor(link.to, 'left').x
    const startY = getNodeCenter(link.from).y
    const endY = getNodeCenter(link.to).y
    return { x: (startX + endX) / 2, y: (startY + endY) / 2}
  }
}

function getLabelSize(link: any) {
  const op = getOperation(link)
  const text = op?.type || ""
  const textWidth = text.length * 7 // 每字符大约7px
  const iconWidth = isAtomicOp(text) ? 20 : 0
  const padding = 20
  return { width: textWidth + iconWidth + padding }
}


// 🔹 统一监听逻辑
function setupWatchers() {
  // 1️⃣ 监听 store.biResult
  watch(() => store.state.biResult, (newVal) => {
    if (newVal) {
      console.log('📦 store.biResult 已更新:', newVal)
      console.log('🧩 sample 内容(原始):', JSON.parse(JSON.stringify(sample.value)))
      loadSample()
    }
  }, { deep: true })


  // 2️⃣ 监听 viewModes
  watch(viewModes, (newVal) => {
    nextTick(() => loadSample())
  }, { deep: true })

  // 3️⃣ 监听窗口 resize
  onMounted(() => {
    window.addEventListener('resize', () => {
      nextTick(() => loadSample())
    })
  })
}

setupWatchers()


</script>

<template>
  <div>
    <button @click="loadSample">加载样例数据</button>

    <div ref="flowchartRef" class="flowchart">
      <!-- 连接线 -->
      <svg class="links" :width="svgWidth" height=100%>
        <defs>
          <!-- 定义菱形 -->
          <marker
            id="diamond"
            markerWidth="12"
            markerHeight="12"
            refX="6"
            refY="6"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M6,0 L12,6 L6,12 L0,6 Z" fill="#cbdcc1"/>
          </marker>
        </defs>


        <!-- 贝塞尔曲线 -->
        <path
          v-for="link in links"
          :key="link.from + '-' + link.to"
          :d="getPath(link)"
          stroke="#cbdcc1"
          stroke-opacity="0.6"
          fill="none"
          stroke-width="1.5"
          marker-end="url(#diamond)"
        />


        <!-- 连线上加原子操作标签 -->
        <g
          v-for="link in links"
          :key="link.from + '-' + link.to + '-label'"
          :transform="`translate(${getLabelPos(link).x}, ${getLabelPos(link).y})`"
        >
          <!-- 背景圆角矩形 -->
          <rect
            :x="-(getLabelSize(link).width / 2)"
            y="-14"
            :width="getLabelSize(link).width"
            height="28"
            rx="14"
            ry="14"
            fill="white"
            stroke="black"
            stroke-width="1"
            
          />

          <!-- 图标 -->
          <image
            v-if="isAtomicOp(getOperation(link)?.type)"
            :href="`/icons/${(getOperation(link)?.type || '').replace(/[\/\\]/g, '_')}.png`"
            :x="-(getLabelSize(link).width / 2) + 6"
            y="-10"
            width="16"
            height="16"
          />

          <!-- 文字 -->
          <text
            x="4"         
            y="4"
            font-size="12"
            font-style="italic"
            fill="black"
            text-anchor="middle"
          >
            {{ getOperation(link)?.type || "" }}
          </text>
        </g>
      </svg>

      <!-- 主线节点 -->
      <div class="mainline">
        <div
          v-for="node in mainline"
          :key="node.id"
          :class="['node', isAtomicOp(node.type) ? 'atomic' : 'normal']"
          :ref="(el: any) => { if (el) nodeRefs[node.id] = el as HTMLElement }"
        >
          <div class="nl">NL Explaination: {{ node.NL }}</div>
          <!-- 如果是原子操作节点，展示 Table 或 Chart -->
          <div v-if="isAtomicOp(node.type) && node.Table" class="data-view">
            <!-- Table 模式 -->
            <div class="table-desc">SQL Code Snippet: {{ node.Table.desc }}</div>

            <!-- 切换按钮 -->
            <div class="view-toggle">
                <el-segmented
                  v-model="viewModes[node.id]"
                  :options="[
                    { label: 'Table', value: 'table' },
                    { label: 'Chart', value: 'chart' }
                  ]"
                  size="small"
                />
            </div>
            
            <div v-if="viewModes[node.id] === 'table'" class="data-table">
              <el-table
                v-if="node.Table.data && node.Table.data.length > 1"
                :data="node.Table.data.slice(1).map((row: any) => {
                  return Object.fromEntries(node.Table.data[0].map((col: any, ci: number) => [col, row[ci]]))
                })"
                border
                stripe
                style="width: 100%; margin-top: 2px; font-size: 11px;"
              >
                <el-table-column
                  v-for="(col, ci) in node.Table.data[0]"
                  :key="ci"
                  :prop="col"
                  align="center"
                  header-align="center"
                  :min-width="60"
                  show-overflow-tooltip
                >
                  <template #header>
                    <div class="editable-header" @click="startEditField(node.id, ci, getFieldName(node.id, ci, col))">
                      <!-- 编辑模式 -->
                      <div v-if="isEditingField(node.id, ci)" class="edit-container">
                        <input 
                          v-model="editingValue"
                          @keyup.enter="saveFieldName"
                          @keyup.escape="cancelEdit"
                          @blur="saveFieldName"
                          class="field-input"
                          ref="fieldInput"
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
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- Chart 模式 -->
            <div v-else class="data-chart">
              <ChartViewer 
                v-if="node.Table.data && node.Table.data.length > 1"
                :data="node.Table.data"
                :title="`${node.type} - ${node.id}`"
              />
              <div v-else class="no-data">
                暂无数据可展示
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- keywords 节点 -->
      <div class="keywords">
        <div
          v-for="node in keywords"
          :key="node.id"
          class="keyword-node"
          :ref="(el: any) => { if (el) nodeRefs[node.id] = el as HTMLElement }"
        >
          {{ node.NL }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flowchart {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  /* padding: 40px; */
  width: 100%;
  min-height: 600px;
  margin-bottom: 10px;
}

.mainline {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60px;
}

.keywords {
  width: 220px;
  margin-left: 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.node {
  width: 350px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #ccc;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.node.atomic {
  background: #e8f1e3;
}

.node.normal {
  background: #fefce8;
}

.keyword-node {
  width: 160px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #cbd5e0;
  background: #f0fff4;
  text-align: center;
  font-size: 13px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.title {
  font-size: 14px;
  font-weight: bold;
  margin-top: 0px;
  margin-bottom: 5px;
}
.nl {
  font-size: 12px;
  color: #4a5568;
}
.table-desc {
  font-family: 'Fira Code', 'Consolas', 'Courier New', monospace; /* 等宽字体 */
  font-size: 12px;   /* 稍小一点 */
  font-weight: 500;  /* 半粗 */
  color: #4a5568;    /* 深灰色，类似 Tailwind slate-700 */
  margin-bottom: 4px;
  white-space: pre-wrap;  /* SQL 片段换行友好 */
  word-break: break-word;
}

.data-view {
  margin-top: 6px;
}

.view-toggle {
  margin-bottom: 6px;
}

.data-chart {
  margin-top: 4px;
}

.no-data {
  text-align: center;
  color: #909399;
  font-style: italic;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 6px;
}


.links {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}

/* 可编辑表头样式 */
.editable-header {
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.editable-header:hover {
  background-color: #f0f9ff;
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
  font-size: 9px;
  color: #718096;
  font-style: italic;
  opacity: 0.7;
}

.reset-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
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
  font-size: 11px;
  background: white;
  outline: none;
}
</style>
