<template>
  <div class="chart-viewer">
    <!-- 图表容器 -->
    <div class="chart-container" :class="{ 'with-sidebar': showSidebar }">
      <!-- 图表头部工具栏 -->
      <div class="chart-header">
        <div class="chart-title">{{ title || '数据图表' }}</div>
        <div class="chart-actions">
          <el-button 
            :icon="Setting" 
            circle 
            size="small" 
            @click="toggleSidebar"
            :type="showSidebar ? 'primary' : 'default'"
          />
        </div>
      </div>
      
      <!-- 图表主体 -->
      <div class="chart-content">
        <v-chart 
          class="chart" 
          :option="chartOption" 
          :loading="loading"
          autoresize
        />
      </div>
    </div>

    <!-- 配置侧边栏 -->
    <div class="chart-sidebar" v-show="showSidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">图表设置</span>
        <el-button 
          :icon="Close" 
          text 
          size="small" 
          @click="showSidebar = false"
        />
      </div>
      
      <div class="sidebar-content">
        <!-- 图表类型选择 -->
        <div class="config-section">
          <div class="section-title">图表类型</div>
          <el-select v-model="chartType" @change="updateChartType" style="width: 100%">
            <el-option label="柱状图" value="bar" />
            <el-option label="折线图" value="line" />
            <el-option label="饼图" value="pie" />
            <el-option label="散点图" value="scatter" />
          </el-select>
        </div>

        <!-- X轴配置 -->
        <div class="config-section" v-if="chartType !== 'pie'">
          <div class="section-title">X轴字段</div>
          <el-select v-model="xAxisField" @change="updateChart" style="width: 100%">
            <el-option 
              v-for="field in availableFields" 
              :key="field" 
              :label="field" 
              :value="field" 
            />
          </el-select>
        </div>

        <!-- Y轴配置 -->
        <div class="config-section" v-if="chartType !== 'pie'">
          <div class="section-title">Y轴字段</div>
          <el-select v-model="yAxisField" @change="updateChart" style="width: 100%">
            <el-option 
              v-for="field in numericFields" 
              :key="field" 
              :label="field" 
              :value="field" 
            />
          </el-select>
        </div>

        <!-- 饼图配置 -->
        <div v-if="chartType === 'pie'">
          <div class="config-section">
            <div class="section-title">标签字段</div>
            <el-select v-model="pieNameField" @change="updateChart" style="width: 100%">
              <el-option 
                v-for="field in availableFields" 
                :key="field" 
                :label="field" 
                :value="field" 
              />
            </el-select>
          </div>
          
          <div class="config-section">
            <div class="section-title">数值字段</div>
            <el-select v-model="pieValueField" @change="updateChart" style="width: 100%">
              <el-option 
                v-for="field in numericFields" 
                :key="field" 
                :label="field" 
                :value="field" 
              />
            </el-select>
          </div>
        </div>


      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { Setting, Close } from '@element-plus/icons-vue'

// 注册ECharts组件
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface Props {
  data: any[][]
  title?: string
}

const props = defineProps<Props>()

// 响应式数据
const showSidebar = ref(false)
const loading = ref(false)
const chartType = ref('bar')
const xAxisField = ref('')
const yAxisField = ref('')
const pieNameField = ref('')
const pieValueField = ref('')
const showGrid = ref(false)
const showLegend = ref(false)
const showTooltip = ref(false)
const selectedColor = ref('#5470c6')

// 计算可用字段
const availableFields = computed(() => {
  if (!props.data || props.data.length === 0) return []
  return props.data[0] || []
})

// 计算数值字段
const numericFields = computed(() => {
  if (!props.data || props.data.length < 2) return []
  const headers = props.data[0]
  const firstRow = props.data[1]
  
  return headers.filter((header, index) => {
    const value = firstRow[index]
    return typeof value === 'number' || !isNaN(Number(value))
  })
})

// 处理数据
const processedData = computed(() => {
  if (!props.data || props.data.length < 2) return []
  
  const headers = props.data[0]
  const rows = props.data.slice(1)
  
  return rows.map(row => {
    const obj: Record<string, any> = {}
    headers.forEach((header, index) => {
      obj[header] = row[index]
    })
    return obj
  })
})

// 图表配置
const chartOption = computed(() => {
  if (!processedData.value.length) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center'
      }
    }
  }

  const baseOption = {
    backgroundColor: 'transparent',
    color: [selectedColor.value],
    tooltip: showTooltip.value ? {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    } : undefined,
    legend: showLegend.value ? {
      top: 10
    } : undefined,
    grid: showGrid.value ? {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    } : undefined
  }

  if (chartType.value === 'pie') {
    return {
      ...baseOption,
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      series: [{
        name: '数据分布',
        type: 'pie',
        radius: '50%',
        data: processedData.value.map(item => ({
          name: item[pieNameField.value] || '',
          value: Number(item[pieValueField.value]) || 0
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }
  }

  // 柱状图、折线图、散点图
  const xData = processedData.value.map(item => item[xAxisField.value] || '')
  const yData = processedData.value.map(item => Number(item[yAxisField.value]) || 0)

  return {
    ...baseOption,
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: yAxisField.value,
      type: chartType.value,
      data: yData,
      barWidth: chartType.value === 'bar' ? '60%' : undefined,
      smooth: chartType.value === 'line'
    }]
  }
})

// 方法
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
}

const updateChartType = () => {
  updateChart()
}

const updateChart = () => {
  // 触发图表重新渲染
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 100)
}


// 初始化
onMounted(() => {
  if (availableFields.value.length > 0) {
    xAxisField.value = availableFields.value[0]
    if (numericFields.value.length > 0) {
      yAxisField.value = numericFields.value[0]
      pieNameField.value = availableFields.value[0]
      pieValueField.value = numericFields.value[0]
    }
  }
})

// 监听数据变化
watch(() => props.data, () => {
  if (availableFields.value.length > 0 && !xAxisField.value) {
    xAxisField.value = availableFields.value[0]
  }
  if (numericFields.value.length > 0 && !yAxisField.value) {
    yAxisField.value = numericFields.value[0]
  }
}, { immediate: true })
</script>

<style scoped>
.chart-viewer {
  display: flex;
  height: 400px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.chart-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.chart-container.with-sidebar {
  flex: 1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.chart-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.chart-actions {
  display: flex;
  gap: 8px;
}

.chart-content {
  flex: 1;
  padding: 8px;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-sidebar {
  width: 150px;
  border-left: 1px solid #e4e7ed;
  background: #fff;
  display: flex;
  flex-direction: column;
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.sidebar-content {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.config-section {
  margin-bottom: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 6px;
}

.config-item {
  margin-bottom: 8px;
}

</style>
