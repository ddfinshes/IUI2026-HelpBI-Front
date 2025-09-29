import type { TransformResponse, TreeNode } from '../store/biStore'

export async function loadSampleFromJson(): Promise<TransformResponse> {
	const resp = await fetch('/sample_bi.json')
	const json = await resp.json()
	const bi = json.bi_process_tree

	// Layer 1: root user query
	const rootChildren: TreeNode[] = []

	// Layer 2: decomposition buckets (show labels)
	const metricsBucket: TreeNode = { id: 'bucket-metrics', label: '指标', type: 'projection', children: [], data: { title: '指标' } }
	const dimensionsBucket: TreeNode = { id: 'bucket-dimensions', label: '维度', type: 'projection', children: [], data: { title: '维度' } }
	const filtersBucket: TreeNode = { id: 'bucket-filters', label: '过滤条件', type: 'filter', children: [], data: { title: '过滤条件' } }

	// Layer 3: concepts under each bucket
	for (const m of bi.query_decomposition.metrics) {
		metricsBucket.children.push({ id: `metric-${m.technical_name}`, label: `${m.name}`, type: 'metric', children: [], data: { technical_name: m.technical_name, aggregation: m.aggregation } })
	}
	for (const d of bi.query_decomposition.dimensions) {
		dimensionsBucket.children.push({ id: `dimension-${d.technical_name}`, label: `${d.name}`, type: 'dimension', children: [], data: { technical_name: d.technical_name } })
	}
	for (const f of bi.query_decomposition.filters) {
		filtersBucket.children.push({ id: `filter-${f.technical_name}`, label: `${f.field_name}`, type: 'filter', children: [], data: { technical_name: f.technical_name, operator: f.operator, value: f.value } })
	}

	rootChildren.push(metricsBucket, dimensionsBucket, filtersBucket)

	// Layer 4: knowledge descriptions for each concept
	function conceptNote(id: string, text: string): TreeNode { return { id: `${id}-note`, label: '', type: 'nl', children: [], data: { description: text } } }
	metricsBucket.children.push(conceptNote('metric-sales', "sales：每日0点到24点销售数据（万元），每日0点更新"))
	dimensionsBucket.children.push(conceptNote('dim-store', "store_name：店铺名称，如 'xxx'"))
	filtersBucket.children.push(conceptNote('filter-date', "date：日期datetime，格式为 'yyyy-mm-dd'"))
	filtersBucket.children.push(conceptNote('filter-province', "province：省份，包含上海、北京、重庆、天津"))

	// Layer 5+: stepwise query process with table nodes
	// Step 1: store_information columns
	const step1: TreeNode = {
		id: 'step-1', label: '', type: 'data_retrieval', children: [],
		data: { tableName: 'store_information', columns: ['store_name','province'] }
	}
	// Step 2: filter Sichuan stores
	const step2: TreeNode = {
		id: 'step-2', label: '', type: 'filter', children: [],
		data: { input: 'all_stores_with_province', condition: "province = '四川省'", output: 'sichuan_stores' }
	}
	// Step 3: reginal_order columns
	const step3: TreeNode = {
		id: 'step-3', label: '', type: 'data_retrieval', children: [],
		data: { tableName: 'reginal_order', columns: ['date','sales','store_name'] }
	}
	// Step 4: date filter
	const step4: TreeNode = {
		id: 'step-4', label: '', type: 'filter', children: [],
		data: { input: 'all_orders', condition: "date BETWEEN '2022-01-01' AND '2022-12-31'", output: 'orders_in_2022' }
	}
	// Step 5: join to get filtered_sales
	const step5: TreeNode = {
		id: 'step-5', label: '', type: 'join', children: [],
		data: { left: 'orders_in_2022', right: 'sichuan_stores', on: 'store_name', output: 'filtered_sales', tableName: 'filtered_sales', columns: ['date','sales','store_name'] }
	}
	// Step 6: aggregate final
	const step6: TreeNode = {
		id: 'step-6', label: '', type: 'aggregate', children: [],
		data: { input: 'filtered_sales', group_by: ['store_name'], metrics: [{ field: 'sales', fn: 'SUM', as: 'sum_sales' }], tableName: 'result', columns: ['store_name','sum_sales'] }
	}

	// Attach process chain
	filtersBucket.children.push(step1)
	step1.children.push(step2)
	step2.children.push(step3)
	step3.children.push(step4)
	step4.children.push(step5)
	step5.children.push(step6)

	const root: TreeNode = {
		id: 'root-json',
		label: `用户查询：${bi.user_query.raw_text}`,
		type: 'root',
		children: rootChildren
	}

	const nl_steps: string[] = [
		'时间线',
		'1) 拆解目标（指标/维度/过滤条件）',
		"2) 从 store_information 读取并筛选四川省门店",
		"3) 从 reginal_order 读取并筛选 2022 年订单",
		"4) 关联得到 filtered_sales",
		"5) 汇总得到每门店 sum_sales"
	]

	const sql_description = '基于时间线执行：拆解 → 取数/过滤 → 关联 → 汇总。'
	const sql = '-- 如需展示 SQL，可在此处生成拼接\n'

	return { root, nl_steps, sql_description, sql }
}
