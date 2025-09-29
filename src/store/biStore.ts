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

const state = reactive<{ result: TransformResponse | null }>({ result: null })

export function useBiStore() {
	return {
		get result() { return state.result },
		setResult(r: TransformResponse) { state.result = r }
	}
}





