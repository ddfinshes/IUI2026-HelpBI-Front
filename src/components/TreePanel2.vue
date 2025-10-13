<script setup lang="ts">
import { ref, nextTick, onMounted, reactive } from 'vue'
import sample from '../assests/Example.json'
import { watch } from 'vue'
import { watchEffect } from 'vue'
import ChartViewer from './ChartViewer.vue'

const flowchartRef = ref<HTMLElement | null>(null)
const svgWidth = ref(800)
const svgHeight = ref(1500)
const links = ref<any[]>([])

const mainline = ref<any[]>([])   // 主线节点
const keywords = ref<any[]>([])   // 关键词节点
const nodesMap = ref<Record<string, any>>({})
const nodeRefs: Record<string, HTMLElement> = {}
const hoveredLink = ref<{ from: string, to: string, condition: string } | null>(null)
const activeEdges = ref<string[]>([])
const activeNode = ref<any | null>(null)



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
sample.nodes.forEach((n: any) => {
  nodesMap.value[n.id] = n
  viewModes.value[n.id] = 'table'
})

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

// 节点内容编辑状态管理
const editingNodeContent = ref<{ nodeId: string; field: 'NL' | 'condition' } | null>(null)
const editingNodeValue = ref('')
const nodeContentInput = ref<HTMLInputElement | HTMLTextAreaElement>()

// 存储节点内容的修改
const nodeContents = reactive<Record<string, { NL?: string; condition?: string[] }>>({})

// 从本地存储加载节点内容
const loadNodeContents = () => {
  try {
    const saved = localStorage.getItem('bi-node-contents')
    if (saved) {
      const parsed = JSON.parse(saved)
      Object.assign(nodeContents, parsed)
    }
  } catch (error) {
    console.warn('Failed to load node contents from localStorage:', error)
  }
}

// 保存节点内容到本地存储
const saveNodeContentsToStorage = () => {
  try {
    localStorage.setItem('bi-node-contents', JSON.stringify(nodeContents))
  } catch (error) {
    console.warn('Failed to save node contents to localStorage:', error)
  }
}

// 初始化时加载保存的节点内容
loadNodeContents()

// 获取节点内容（优先使用修改后的内容）
const getNodeContent = (nodeId: string, field: 'NL' | 'condition', originalValue: any) => {
  if (nodeContents[nodeId] && nodeContents[nodeId][field]) {
    return nodeContents[nodeId][field]
  }
  return originalValue
}

// 开始编辑节点内容
const startEditNodeContent = (nodeId: string, field: 'NL' | 'condition', currentValue: any) => {
  console.log('开始编辑节点内容:', { nodeId, field, currentValue })
  editingNodeContent.value = { nodeId, field }
  
  if (field === 'condition' && Array.isArray(currentValue)) {
    editingNodeValue.value = currentValue.join(', ')
  } else {
    editingNodeValue.value = currentValue || ''
  }
  
  // 在下一个tick中聚焦输入框并选中文本
  setTimeout(() => {
    if (nodeContentInput.value) {
      nodeContentInput.value.focus()
      nodeContentInput.value.select()
    }
  }, 0)
}

// 保存节点内容
const saveNodeContent = () => {
  if (!editingNodeContent.value) return
  
  const { nodeId, field } = editingNodeContent.value
  
  // 初始化该节点的内容对象
  if (!nodeContents[nodeId]) {
    nodeContents[nodeId] = {}
  }
  
  // 保存修改后的内容
  if (field === 'condition') {
    nodeContents[nodeId][field] = editingNodeValue.value.split(',').map(s => s.trim()).filter(s => s)
  } else {
    nodeContents[nodeId][field] = editingNodeValue.value
  }
  
  // 保存到本地存储
  saveNodeContentsToStorage()
  
  // 结束编辑
  editingNodeContent.value = null
  editingNodeValue.value = ''
}

// 取消编辑节点内容
const cancelEditNodeContent = () => {
  editingNodeContent.value = null
  editingNodeValue.value = ''
}

// 检查是否正在编辑节点内容
const isEditingNodeContent = (nodeId: string, field: 'NL' | 'condition') => {
  return editingNodeContent.value?.nodeId === nodeId && editingNodeContent.value?.field === field
}

// 重置节点内容到原始值
const resetNodeContent = (nodeId: string, field: 'NL' | 'condition') => {
  if (nodeContents[nodeId] && nodeContents[nodeId][field]) {
    delete nodeContents[nodeId][field]
    // 如果该节点的所有内容都重置了，删除该节点
    if (Object.keys(nodeContents[nodeId]).length === 0) {
      delete nodeContents[nodeId]
    }
    saveNodeContentsToStorage()
  }
}

// 检查节点内容是否被修改过
const isNodeContentModified = (nodeId: string, field: 'NL' | 'condition') => {
  return nodeContents[nodeId] && nodeContents[nodeId][field]
}

function normalizeOperation(op: any) { 
  if (!op) return { type: '', condition: '' }
  const { type, condition } = op

  return {
    type: type || '',
    condition: condition || ''
  }
}

function getOperation(link: any) {
  const fromNode = nodesMap.value[link.from]
  return fromNode?.operation ? normalizeOperation(fromNode.operation) : null
}

function loadSample() {
  nodesMap.value = {}
  sample.nodes.forEach((n: any) => {
    nodesMap.value[n.id] = n
  })

  // edges -> links（包含 operation 信息）
  links.value = sample.edges.map((e: any) => ({
    from: e.from,
    to: e.to,
  }))

  mainline.value = sample.nodes.filter((n: any) => n.type !== 'Keyword')
  keywords.value = sample.nodes.filter((n: any) => n.type === 'Keyword')

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
  console.log(link.from)
  console.log(link.to)
  console.log(fromEl)
  console.log(toEl)
  console.log("AAAAAA")
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

function escapeHtml(str: string) {
  return String(str).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string,string>)[m]
  )
}
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightNL(node: any) {
  if (node.type === "Keyword"){
    if (!activeNode.value || activeNode.value.id !== node.id) {
      return escapeHtml(node.NL || '')
    }
  }

  if (!node?.NL) return ''
  // 原子节点不在 NL 中高亮
  if (isAtomicOp(node.type)) return escapeHtml(node.NL)

  const conditions = node.operation?.condition
  if (!conditions) return escapeHtml(node.NL)

  const condList = Array.isArray(conditions) ? conditions : [conditions]
  let html = escapeHtml(node.NL)

  condList.forEach((cond: any) => {
    if (!cond || typeof cond !== 'string') return
    const escCond = escapeRegExp(escapeHtml(cond))
    const re = new RegExp(`(${escCond})`, 'gi')
    // 内联样式确保样式生效（不依赖 scoped CSS）
    html = html.replace(re, `<span class="highlight" style="background:#ffe58f;padding:0 2px;border-radius:3px;">$1</span>`)
  })

  return html
}

function highlightCondition(col: string, node: any) {
  if (!activeNode.value || activeNode.value.id !== node.id) {
    return escapeHtml(col)
  }

  const conditions = activeNode.value.operation?.condition
  if (!conditions) return escapeHtml(col)

  const condList = Array.isArray(conditions) ? conditions : [conditions]
  let html = escapeHtml(col)

  for (const cond of condList) {
    if (!cond || typeof cond !== 'string') continue
    const escCond = escapeRegExp(cond.trim())

    // 用更精确的边界匹配：单词边界 或 非字母数字下划线边界
    // 例如匹配 " sales "、"(sales)"、"'sales'"、"`sales`" 等
    const re = new RegExp(`(?<![\\w])(${escCond})(?![\\w])`, 'g')

    html = html.replace(
      re,
      `<span class="highlight" style="background:#ffe58f;padding:0 2px;border-radius:3px;">$1</span>`
    )
  }

  return html
}


function handleNodeClick(node: any) {
  activeNode.value = node
  if (node.operation && Array.isArray(node.operation.activate_edges)) {
    activeEdges.value = node.operation.activate_edges
  } else {
    activeEdges.value = []
  }
}


// 监听 viewModes 变化时重新渲染
watch(viewModes, () => {
  nextTick(() => {
    loadSample()
  })
}, { deep: true })

// 监听窗口大小时重新渲染
onMounted(() => {
  window.addEventListener('resize', () => {
    nextTick(() => {
      loadSample()
    })
  })
})


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
          v-for="(link, i) in links"
          :key="link.from + '-' + link.to"
          :d="getPath(link)"
          :stroke="activeEdges.includes(String(i)) ? '#ff7b00' : '#cbdcc1'"
          :stroke-opacity="activeEdges.includes(String(i)) ? 1 : 0.6"
          :stroke-width="activeEdges.includes(String(i)) ? 3 : 1.5"
          fill="none"
          marker-end="url(#diamond)"
          style="cursor: pointer; transition: all 0.2s;"
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
          :ref="el => { if (el) nodeRefs[node.id] = el }"
          
          @click="handleNodeClick(node)"
        >
          <!-- 可编辑的NL内容 -->
          <div class="nl-container">
            <div v-if="isEditingNodeContent(node.id, 'NL')" class="edit-container">
              <textarea 
                v-model="editingNodeValue"
                @keyup.enter="saveNodeContent"
                @keyup.escape="cancelEditNodeContent"
                @blur="saveNodeContent"
                class="node-content-input"
                ref="nodeContentInput"
                rows="3"
              />
            </div>
            <div v-else class="nl-display" @click="startEditNodeContent(node.id, 'NL', node.NL)">
              <div class="nl-text" :class="{ 'modified': isNodeContentModified(node.id, 'NL') }" v-html="highlightNL(node)"></div>
              <div class="nl-actions">
                <button 
                  v-if="isNodeContentModified(node.id, 'NL')"
                  @click.stop="resetNodeContent(node.id, 'NL')"
                  class="reset-btn"
                  title="重置为原始内容"
                >
                  ↶
                </button>
              </div>
            </div>
          </div>
          
          <!-- 分析改写节点的条件编辑 -->
          <div v-if="node.type === 'Analysis Query' && node.operation?.condition" class="condition-container">
            <div class="condition-label">条件:</div>
            <div v-if="isEditingNodeContent(node.id, 'condition')" class="edit-container">
              <input 
                v-model="editingNodeValue"
                @keyup.enter="saveNodeContent"
                @keyup.escape="cancelEditNodeContent"
                @blur="saveNodeContent"
                class="node-content-input"
                ref="nodeContentInput"
                placeholder="输入条件，用逗号分隔"
              />
            </div>
            <div v-else class="condition-display" @click="startEditNodeContent(node.id, 'condition', getNodeContent(node.id, 'condition', node.operation.condition))">
              <div class="condition-text" :class="{ 'modified': isNodeContentModified(node.id, 'condition') }">
                {{ getNodeContent(node.id, 'condition', node.operation.condition).join(', ') }}
              </div>
              <div class="condition-actions">
                <button 
                  v-if="isNodeContentModified(node.id, 'condition')"
                  @click.stop="resetNodeContent(node.id, 'condition')"
                  class="reset-btn"
                  title="重置为原始条件"
                >
                  ↶
                </button>
              </div>
            </div>
          </div>
          
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
                :data="node.Table.data.slice(1).map(row => {
                  return Object.fromEntries(node.Table.data[0].map((col, ci) => [col, row[ci]]))
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
                    <div class="editable-header" @click.stop="startEditField(node.id, ci, getFieldName(node.id, ci, col))">
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
          :ref="el => { if (el) nodeRefs[node.id] = el }"
          @click="handleNodeClick(node)"
          v-html="highlightNL(node)"
        >
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
  cursor: pointer
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
  cursor: pointer
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

.highlight {
  background-color: #ffe58f;
  color: #000;
  border-radius: 3px;
  padding: 0 2px;
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

/* 节点内容编辑样式 */
.nl-container {
  margin-bottom: 8px;
}

.nl-display {
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.nl-display:hover {
  background-color: #f0f9ff;
}

.nl-text {
  font-size: 12px;
  color: #4a5568;
  transition: color 0.2s ease;
}

.nl-text.modified {
  color: #4299e1;
  font-weight: 600;
}

.nl-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.condition-container {
  margin-top: 8px;
  padding: 6px;
  background: #f8fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.condition-label {
  font-size: 11px;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 4px;
}

.condition-display {
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.condition-display:hover {
  background-color: #f0f9ff;
}

.condition-text {
  font-size: 11px;
  color: #4a5568;
  transition: color 0.2s ease;
  font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
}

.condition-text.modified {
  color: #4299e1;
  font-weight: 600;
}

.condition-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.node-content-input {
  width: 100%;
  border: 2px solid #4299e1;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  background: white;
  outline: none;
  font-family: inherit;
}

.node-content-input[type="text"] {
  font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
}
</style>
