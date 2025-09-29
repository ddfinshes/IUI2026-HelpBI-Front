<script setup lang="ts">
import { computed } from 'vue'
import type { TreeNode } from '../store/biStore'

const props = defineProps<{ root: TreeNode }>()

interface PositionedNode {
	id: string
	label: string
	type: string
	x: number
	y: number
	width: number
	height: number
	children: PositionedNode[]
	data?: any
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 60
const H_GAP = 28
const V_GAP = 70
const PADDING = 12

function layout(root: TreeNode) {
	let xCursor = 0
	const nodes: PositionedNode[] = []
	const edges: Array<{ from: PositionedNode; to: PositionedNode }> = []

	function measure(node: TreeNode): number {
		if (!node.children || node.children.length === 0) return NODE_WIDTH
		const widths = node.children.map(measure)
		return Math.max(NODE_WIDTH, widths.reduce((a, b) => a + b + H_GAP, -H_GAP))
	}

	function position(node: TreeNode, depth: number): PositionedNode {
		let positionedChildren: PositionedNode[] = []
		if (node.children && node.children.length > 0) {
			for (const child of node.children) positionedChildren.push(position(child, depth + 1))
			const left = positionedChildren[0].x
			const right = positionedChildren[positionedChildren.length - 1].x
			const mid = left + (right - left)
			const me: PositionedNode = {
				id: node.id,
				label: node.label || '',
				type: node.type,
				x: mid,
				y: depth * (NODE_HEIGHT + V_GAP),
				width: NODE_WIDTH,
				height: NODE_HEIGHT,
				children: positionedChildren,
				data: (node as any).data
			}
			for (const c of positionedChildren) edges.push({ from: me, to: c })
			nodes.push(me)
			return me
		} else {
			const me: PositionedNode = {
				id: node.id,
				label: node.label || '',
				type: node.type,
				x: xCursor,
				y: depth * (NODE_HEIGHT + V_GAP),
				width: NODE_WIDTH,
				height: NODE_HEIGHT,
				children: [],
				data: (node as any).data
			}
			nodes.push(me)
			xCursor += NODE_WIDTH + H_GAP
			return me
		}
	}

	position(root, 0)

	const minX = Math.min(...nodes.map(n => n.x))
	for (const n of nodes) n.x = n.x - minX + PADDING

	const width = Math.max(...nodes.map(n => n.x + n.width)) + PADDING
	const height = Math.max(...nodes.map(n => n.y + n.height)) + PADDING

	return { nodes, edges, width, height }
}

const computedLayout = computed(() => layout(props.root))
</script>

<template>
  <div class="canvas-wrap">
    <svg :viewBox="`0 0 ${computedLayout.width} ${computedLayout.height}`" width="100%" preserveAspectRatio="xMidYMin meet">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
        </marker>
      </defs>
      <g class="edges">
        <path v-for="(e, i) in computedLayout.edges" :key="i"
              :d="`M ${e.from.x + NODE_WIDTH/2} ${e.from.y + NODE_HEIGHT} L ${e.to.x + NODE_WIDTH/2} ${e.to.y}`"
              stroke="#cbd5e1" stroke-width="1.6" fill="none" marker-end="url(#arrow)" />
      </g>
      <g class="nodes">
        <g v-for="n in computedLayout.nodes" :key="n.id" :transform="`translate(${n.x},${n.y})`">
          <rect :width="NODE_WIDTH" :height="NODE_HEIGHT" rx="8" ry="8" fill="#ffffff" stroke="#94a3b8" />
          <text x="10" y="18" class="label">{{ n.label || (n.data && (n.data.tableName || n.data.description)) || n.type }}</text>
          <text x="10" y="34" class="type">{{ n.data && Array.isArray(n.data.columns) ? n.data.columns.join(', ') : n.type }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.canvas-wrap { overflow: auto; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
.label { font-size: 12px; font-weight: 600; fill: #0f172a; }
.type { font-size: 11px; fill: #64748b; }
</style>
