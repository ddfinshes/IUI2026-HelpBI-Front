import axios from 'axios'
import type { TransformResponse } from '../store/biStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const biApi = {
	async transform(payload: { conversation: Array<{ role: 'user' | 'assistant' | 'system', content: string, timestamp?: string }> }): Promise<TransformResponse> {
		const { data } = await axios.post(`${BASE_URL}/bi/transform`, payload)
		return data
	}
}





