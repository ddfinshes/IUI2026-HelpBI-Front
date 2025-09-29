<script setup lang="ts">
import { ref } from 'vue'
import { biApi } from '../services/api'
import { useBiStore } from '../store/biStore'

type Role = 'user' | 'assistant' | 'system'

interface ChatMessage {
  role: Role
  content: string
  timestamp?: string
}

const input = ref('')
const messages = ref<ChatMessage[]>([])
const store = useBiStore()

function send() {
  const text = input.value.trim()
  if (!text) return
  messages.value.push({
    role: 'user',
    content: text,
    timestamp: new Date().toISOString()
  })
  input.value = ''

  // 模拟大模型回复，可以替换成真实 API
  setTimeout(() => {
    messages.value.push({
      role: 'assistant',
      content: '这是大模型的回复: ' + text,
      timestamp: new Date().toISOString()
    })
  }, 800)
}

async function transformToBi() {
  const resp = await biApi.transform({ conversation: messages.value })
  store.setResult(resp)
}
</script>

<template>
  <div class="wrap">
    <div class="toolbar">
      <span class="arrow" @click="transformToBi">➡️</span>
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

.arrow {
  font-size: 20px;
  cursor: pointer;
  user-select: none;
}
.arrow:hover {
  opacity: 0.7;
}
</style>



