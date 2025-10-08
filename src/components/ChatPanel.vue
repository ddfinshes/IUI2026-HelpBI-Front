<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import axios from 'axios'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useBiStore } from '../store/biStore'
import { computed } from 'vue'

type Role = 'user' | 'assistant' | 'system'

interface ChatMessage {
  role: Role
  content: string
  timestamp?: string
}

const input = ref('')
const messages = ref<ChatMessage[]>([])
const store = useBiStore()
const leftView = ref<any>(null)
const activeTab = ref('data') // 切换 tab

const tableColumns = computed(() => {
  if (!leftView.value?.excute_result?.data?.length) return []
  return leftView.value.excute_result.data[0] // 第一行是表头
})

const tableData = computed(() => {
  if (!leftView.value?.excute_result?.data?.length) return []
  const [header, ...rows] = leftView.value.excute_result.data
  return rows.map(row => {
    const obj: Record<string, any> = {}
    header.forEach((key, i) => (obj[key] = row[i]))
    return obj
  })
})

// 针对每条 assistant 消息（如果包含 left_view_info）解析数据
function parseTableData(leftView: any) {
  if (!leftView?.excute_result?.data?.length) return { columns: [], rows: [] }
  const [header, ...rows] = leftView.excute_result.data
  const formatted = rows.map(r => {
    const obj: Record<string, any> = {}
    header.forEach((h, i) => (obj[h] = r[i]))
    return obj
  })
  return { columns: header, rows: formatted }
}
async function send() {
  const text = input.value.trim()
  if (!text) return

  // 添加用户消息
  // ✅ 把用户输入添加到对话消息中
  messages.value.push({
    role: 'user',
    content: text,
    timestamp: new Date().toISOString()
  })

  input.value = ''

  try {
    const resp = await axios.post('http://127.0.0.1:8000/api/query', { query: text }, {
      headers: { 'Content-Type': 'application/json' }
    })

    // 获取后端返回
    leftView.value = resp.data?.left_view_info
    const leftToRight = resp.data?.left_to_right_info
    store.setResult(leftToRight)
    console.log(leftView.value)
    messages.value.push({
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      leftView: resp.data?.left_view_info // ✅ 新增
    })
  } catch (err: any) {
    messages.value.push({
      role: 'assistant',
      content: `❌ 请求失败: ${err.message}`,
      timestamp: new Date().toISOString()
    })
  }
}

async function transformToBi() {
  try {
    const resp = await axios.post(
      'http://127.0.0.1:8000/api/helpbi',
      store.state.result, // left_to_right_info
      { headers: { 'Content-Type': 'application/json' } }
    )

    console.log(resp.data)
    // 保存右视图数据到 Store
    store.setBiResult(resp.data)

    // 更新消息提示
    messages.value.push({
      role: 'assistant',
      content: `📊 已加载右视图数据（来自 /api/helpbi）`,
      timestamp: new Date().toISOString()
    })

  } catch (err: any) {
    ElMessage.error(`helpbi 请求失败: ${err.message}`)
  }
}



// 🎨 监听 vis_data 渲染图表
watch(messages, async () => {
  await nextTick()
  messages.value.forEach((m, i) => {
    if (!m.leftView?.vis_data) return
    const chartDom = document.getElementById(`chart-${i}`)
    if (!chartDom) return
    const chart = echarts.init(chartDom)
    const vis = m.leftView.vis_data
    const data = m.leftView.excute_result?.data || []
    if (!data.length) return
    const [header, ...rows] = data
    const formatted = rows.map(r => {
      const obj: Record<string, any> = {}
      header.forEach((h, idx) => (obj[h] = r[idx]))
      return obj
    })
    chart.setOption({
      title: { text: vis.title },
      tooltip: { trigger: 'axis' },
      legend: { data: ['Actual Sales', 'Target Sales'] },
      xAxis: { type: 'category', data: formatted.map(r => r.period) },
      yAxis: { type: 'value', name: vis['y-legend'] },
      series: [
        {
          name: 'Actual Sales',
          type: 'bar',
          data: formatted.map(r => r.actual_sales)
        },
        {
          name: 'Target Sales',
          type: 'bar',
          data: formatted.map(r => r.target_sales)
        }
      ]
    })
  })
}, { deep: true })


</script>

<template>
  <div class="wrap">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button 
        class="transform-btn" 
        @click="transformToBi" 
      >
        ➡️
      </button>
    </div>

    <!-- 对话区域 -->
    <div class="msgs">
      <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
        <span class="avatar">
          <span v-if="m.role === 'user'">🧑</span>
          <span v-else>🤖</span>
        </span>

        <div class="bubble">
          <!-- 普通文本内容 -->
          <p v-if="!m.leftView">{{ m.content }}</p>

          <!-- 如果是带分析结果的 assistant 消息 -->
          <div v-else class="analysis-block">
            <p class="query-title">{{ m.leftView.analyzed_query }}</p>

            <!-- Tab 切换 -->
            <el-menu
              mode="horizontal"
              :default-active="activeTab"
              @select="(key) => activeTab = key"
              class="tab-menu"
            >
              <el-menu-item index="data">Data</el-menu-item>
              <el-menu-item index="chart">Chart</el-menu-item>
              <el-menu-item index="code">Code</el-menu-item>
            </el-menu>

            <!-- Data 表格 -->
            <div v-if="activeTab === 'data'" class="tab-content">
              <el-table
                :data="parseTableData(m.leftView).rows"
                stripe
                style="width: 100%"
              >
                <el-table-column
                  v-for="col in parseTableData(m.leftView).columns"
                  :key="col"
                  :prop="col"
                  :label="col"
                />
              </el-table>
            </div>

            <!-- Chart 图表 -->
            <div v-if="activeTab === 'chart'" class="tab-content">
              <div :id="'chart-' + i" style="width: 100%; height: 400px;"></div>
            </div>

            <!-- Code SQL -->
            <div v-if="activeTab === 'code'" class="tab-content">
              <pre><code>{{ m.leftView.sql }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="input">
      <textarea
        v-model="input"
        @keydown.enter.exact.prevent="send"
        placeholder="输入与大模型的对话..."
      />
      <button @click="send">发送</button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.toolbar {
  padding: 8px;
  border-bottom: 1px solid #eee;
}
.msgs {
  flex: 1;
  overflow: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.msg {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.msg.user {
  flex-direction: row-reverse;
  text-align: right;
}
.avatar {
  font-size: 28px;
  line-height: 1;
}
.bubble {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid #eee;
}
.user .bubble {
  background: #d2eaff;
  border-color: #a4d2f4;
}
.assistant .bubble {
  background: #f0f0f0;
}
.input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #eee;
}
textarea {
  flex: 1;
  height: 60px;
  resize: none;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
textarea:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}
button {
  padding: 8px 16px;
  border: none;
  border-radius: 12px;
  background: #409eff;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
button:hover {
  background: #66b1ff;
}
button:active {
  background: #3a8ee6;
}
button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

/* 分析结果展示区 */
.result-panel {
  margin-top: 20px;
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #eee;
}
.query-title {
  font-size: 16px;
  margin: 12px;
}
.tab-menu {
  margin-bottom: 10px;
}
.tab-content {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
}
</style>
