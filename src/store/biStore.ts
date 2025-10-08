import { reactive } from 'vue'

export interface TreeNode {
  id: string
  label: string
  type: string
  children?: TreeNode[]
  data?: Record<string, any> | null
}

export interface TransformResponse {
  root: TreeNode
  nl_steps: string[]
  sql_description: string
  sql: string
}

// ✅ 全局响应式 state（单例）
const state = reactive({
  result: null as TransformResponse | null,
  biResult: null as any | null
})

// ✅ 直接导出函数引用 state（保持同一个引用）
export function useBiStore() {
  return {
    state, // ✅ 直接暴露响应式对象

    setResult(r: TransformResponse) { state.result = r },
    setBiResult(data: any) { state.biResult = { ...data } }
  }
}
