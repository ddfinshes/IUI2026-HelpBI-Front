<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import sample from '../assests/Example.json'

const flowchartRef = ref<HTMLElement | null>(null)
const svgWidth = ref(800)
const svgHeight = ref(600)
const links = ref<any[]>([])

const mainline = ref<any[]>([])   // 主线节点
const keywords = ref<any[]>([])   // 关键词节点
const nodesMap = ref<Record<string, any>>({})
const nodeRefs: Record<string, HTMLElement> = {}

// 定义一个原子操作类型列表
const atomicOps = [
  'Filter',
  'Select',
  'GroupBy',
  'Aggregate',
  'OrderBy',
  'Limit',
  'Join',
  'Transform',
  'Window'
]

// 判断是否是原子操作
const isAtomicOp = (type?: string) => {
  return type ? atomicOps.includes(type) : false
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
    operation: e.operation
  }))

  // 主线：除了 keyword 节点
  mainline.value = sample.nodes.filter((n: any) => n.type !== 'Keyword')

  // keywords
  keywords.value = sample.nodes.filter((n: any) => n.type === 'Keyword')

  nextTick(() => {
    updateSvgSize()
  })
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
  const text = link.operation?.type || ""
  const textWidth = text.length * 7 // 每字符大约7px
  const iconWidth = isAtomicOp(text) ? 20 : 0
  const padding = 20
  return { width: textWidth + iconWidth + padding }
}


onMounted(() => {
  window.addEventListener('resize', () => {
    nextTick(() => updateSvgSize())
  })
})
</script>

<template>
  <div>
    <button @click="loadSample">加载样例数据</button>

    <div ref="flowchartRef" class="flowchart">
      <!-- 连接线 -->
      <svg class="links" :width="svgWidth" :height="svgHeight">
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
            <path d="M6,0 L12,6 L6,12 L0,6 Z" fill="#dae8d2"/>
          </marker>
        </defs>


        <!-- 贝塞尔曲线 -->
        <path
          v-for="link in links"
          :key="link.from + '-' + link.to"
          :d="getPath(link)"
          stroke="#dae8d2"
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
          <rect :x="-(getLabelSize(link).width / 2)" y="-14" :width="getLabelSize(link).width" height="28" rx="14" ry="14"
                fill="white" stroke="black" stroke-width="1" />

          <!-- 图标 -->
          <image
            v-if="isAtomicOp(link.operation?.type)"
            :href="`/icons/${link.operation.type}.png`"
            :x="-(getLabelSize(link).width / 2 - 5)" y="-10"
            width="16" height="16"
          />

          <!-- 文字 -->
          <text :x="-(getLabelSize(link).width / 2 - 25)" y="4" font-size="12" font-style="italic" fill="black">
            {{ link.operation?.type }}
          </text>
        </g>
      </svg>

      <!-- 主线节点 -->
      <div class="mainline">
        <div
          v-for="node in mainline"
          :key="node.id"
          class="node"
          :ref="el => { if (el) nodeRefs[node.id] = el }"
        >
          <h3 class="title">{{ node.type }}</h3>
          <div class="nl">{{ node.NL }}</div>
        </div>
      </div>

      <!-- keywords 节点 -->
      <div class="keywords">
        <div
          v-for="node in keywords"
          :key="node.id"
          class="keyword-node"
          :ref="el => { if (el) nodeRefs[node.id] = el }"
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
  width: 300px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #ccc;
  background: #fefce8;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
.links {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}
</style>
