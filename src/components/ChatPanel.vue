<script setup lang="ts">
import { ref } from 'vue'
import { biApi } from '../services/api'
import { useBiStore } from '../store/biStore'
import axios from 'axios'

type Role = 'user' | 'assistant' | 'system'

interface ChatMessage {
  role: Role
  content: string
  timestamp?: string
}

const input = ref('')
const messages = ref<ChatMessage[]>([])
const store = useBiStore()

async function send() {
  const text = input.value.trim()
  if (!text) return

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: text,
    timestamp: new Date().toISOString()
  })
  input.value = ''

  try {
    // ✅ 调用 Flask 后端接口 /api/query
    const resp = await axios.post('http://127.0.0.1:8000/api/query', { query: text }, {
      headers: { 'Content-Type': 'application/json' }
    })

    // 提取返回结果
    const leftView = resp.data?.left_view_info
    const leftToRight = resp.data?.left_to_right_info

    // 保存到全局 Pinia store（如果需要传递给 /api/helpbi）
    store.setResult(leftToRight)

    // 添加模型回复消息
    messages.value.push({
      role: 'assistant',
      content: `🧠 系统返回的 left_view_info:\n${JSON.stringify(leftView, null, 2)}`,
      timestamp: new Date().toISOString()
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
    const resp = await axios.post('http://127.0.0.1:8000/api/helpbi', store.result, {
      headers: { 'Content-Type': 'application/json' }
    })
    store.setBiResult(resp.data)
    messages.value.push({
      role: 'assistant',
      content: `📊 右视图数据:\n${JSON.stringify(resp.data, null, 2)}`,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    messages.value.push({
      role: 'assistant',
      content: `❌ helpbi 请求失败: ${err.message}`,
      timestamp: new Date().toISOString()
    })
  }
}
</script>

<template>
  <div class="wrap">
    <div class="toolbar">
      <button 
        class="transform-btn" 
        @click="transformToBi" 
        :disabled="!store.result"
      >
        ➡️
      </button>
    </div>

    <div class="msgs">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="msg"
        :class="m.role"
      >
        <span class="avatar">
          <span v-if="m.role === 'user'">🧑</span>
          <span v-else>🤖</span>
        </span>
        <div class="bubble">
          <p>{{ m.content }}</p>
        </div>
      </div>
    </div>

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
  flex-direction: row-reverse; /* 用户在右侧 */
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
  height: 60px; /* 比原来窄 */
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

.arrow {
  font-size: 20px;
  cursor: pointer;
  user-select: none;
}
.arrow:hover {
  opacity: 0.7;
}
</style>



