<template>
  <div class="stats-page">
    <div class="container">
      <div class="header-section">
        <h2>统计分析</h2>
        <div class="period-controls">
          <div class="period-tabs">
            <button
              :class="[
                'tab-btn',
                { active: period === 'day' && !customDateRange },
              ]"
              @click="changePeriod('day')"
            >
              今日
            </button>
            <button
              :class="[
                'tab-btn',
                { active: period === 'week' && !customDateRange },
              ]"
              @click="changePeriod('week')"
            >
              本周
            </button>
            <button
              :class="[
                'tab-btn',
                { active: period === 'month' && !customDateRange },
              ]"
              @click="changePeriod('month')"
            >
              本月
            </button>
          </div>
          <div class="date-picker-wrapper">
            <el-date-picker
              v-model="customDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="handleDateChange"
              clearable
            />
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card card">
          <h3>总时长</h3>
          <div class="stat-value">{{ formatDuration(totalDuration) }}</div>
        </div>

        <div class="stat-card card">
          <h3>记录次数</h3>
          <div class="stat-value">{{ recordCount }}</div>
        </div>

        <div class="stat-card card">
          <h3>平均时长</h3>
          <div class="stat-value">{{ formatDuration(averageDuration) }}</div>
        </div>
      </div>

      <div class="chart-card card">
        <h3>标签时间分布</h3>
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import * as echarts from "echarts";

const period = ref("day");
const customDateRange = ref(null);
const tagStats = ref([]);
const allTags = ref([]);
const chartRef = ref(null);
let chartInstance = null;

onMounted(() => {
  loadTags();
  loadStats();
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
  }
});

watch(
  [tagStats, allTags],
  () => {
    renderChart();
  },
  { deep: true },
);

async function loadTags() {
  if (window.electronAPI) {
    allTags.value = await window.electronAPI.getTags();
  }
}

async function loadStats() {
  if (window.electronAPI) {
    // 根据period或自定义日期范围计算日期范围
    const filters = {};
    const now = new Date();

    if (customDateRange.value && customDateRange.value.length === 2) {
      // 使用自定义日期范围
      filters.startDate = customDateRange.value[0];
      filters.endDate = customDateRange.value[1];
    } else {
      // 使用预设时间段
      if (period.value === "day") {
        const today = now.toISOString().split("T")[0];
        filters.startDate = today;
        filters.endDate = today;
      } else if (period.value === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filters.startDate = weekAgo.toISOString().split("T")[0];
        filters.endDate = now.toISOString().split("T")[0];
      } else if (period.value === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filters.startDate = monthAgo.toISOString().split("T")[0];
        filters.endDate = now.toISOString().split("T")[0];
      }
    }

    // 获取对应时间段的记录数量
    const records = await window.electronAPI.getRecords(filters);
    recordCount.value = records.length;

    // 获取统计数据
    const statsParams = customDateRange.value
      ? filters
      : { period: period.value };
    const rawData = await window.electronAPI.getStatsByTags(statsParams);

    // 处理数据，按标签聚合
    const tagMap = {};

    rawData.forEach((item) => {
      try {
        const tagIds = JSON.parse(item.tags || "[]");
        if (Array.isArray(tagIds) && tagIds.length > 0) {
          tagIds.forEach((tagId) => {
            if (!tagMap[tagId]) {
              tagMap[tagId] = 0;
            }
            tagMap[tagId] += item.total_duration;
          });
        } else {
          // 没有标签的记录归类为"未分类"
          if (!tagMap["untagged"]) {
            tagMap["untagged"] = 0;
          }
          tagMap["untagged"] += item.total_duration;
        }
      } catch (e) {
        console.error("Error parsing tags:", e);
      }
    });

    // 转换为数组并添加标签信息
    tagStats.value = Object.entries(tagMap)
      .map(([tagId, duration]) => {
        if (tagId === "untagged") {
          return {
            id: "untagged",
            name: "未分类",
            color: "#CCCCCC",
            duration: duration,
          };
        }

        const tag = allTags.value.find((t) => t.id === parseInt(tagId));
        return {
          id: tagId,
          name: tag ? tag.name : "未知标签",
          color: tag ? tag.color : "#CCCCCC",
          duration: duration,
        };
      })
      .sort((a, b) => b.duration - a.duration);
  }
}

const recordCount = ref(0);

function changePeriod(newPeriod) {
  period.value = newPeriod;
  customDateRange.value = null;
  loadStats();
}

function handleDateChange() {
  if (customDateRange.value) {
    loadStats();
  }
}

const totalDuration = computed(() => {
  return tagStats.value.reduce((sum, item) => sum + item.duration, 0);
});

const averageDuration = computed(() => {
  if (recordCount.value === 0) return 0;
  return Math.floor(totalDuration.value / recordCount.value);
});

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟`;
  } else {
    return `${seconds % 60}秒`;
  }
}

function getColor(index) {
  const colors = [
    "#FF8C42",
    "#FFB347",
    "#FF6B35",
    "#FFA07A",
    "#FF7F50",
    "#FF6347",
    "#FF4500",
    "#FFD700",
  ];
  return colors[index % colors.length];
}

function renderChart() {
  if (!chartRef.value) return;

  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = echarts.init(chartRef.value);

  const data = tagStats.value.map((item, index) => ({
    name: item.name,
    value: item.duration,
    itemStyle: {
      color: item.color || getColor(index),
    },
  }));

  const option = {
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const percentage =
          totalDuration.value > 0
            ? ((params.value / totalDuration.value) * 100).toFixed(1)
            : 0;
        return `${params.name}<br/>${formatDuration(params.value)} (${percentage}%)`;
      },
    },
    legend: {
      orient: "vertical",
      right: "5%",
      top: "center",
      textStyle: {
        fontSize: 14,
        color: "#2C3E50",
      },
      formatter: (name) => {
        const item = tagStats.value.find((t) => t.name === name);
        if (item) {
          return `${name}  ${formatDuration(item.duration)}`;
        }
        return name;
      },
    },
    series: [
      {
        name: "时间分布",
        type: "pie",
        radius: ["40%", "70%"],
        center: ["35%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: (params) => {
            const percentage =
              totalDuration.value > 0
                ? ((params.value / totalDuration.value) * 100).toFixed(1)
                : 0;
            return `${percentage}%`;
          },
          fontSize: 12,
          color: "#2C3E50",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: "bold",
            formatter: (params) => {
              const percentage =
                totalDuration.value > 0
                  ? ((params.value / totalDuration.value) * 100).toFixed(1)
                  : 0;
              return `${params.name}\n${formatDuration(params.value)}\n${percentage}%`;
            },
          },
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 10,
        },
        data: data,
      },
    ],
  };

  chartInstance.setOption(option);
}
</script>

<style scoped>
.stats-page {
  width: 100%;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-section h2 {
  margin: 0;
}

.period-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.period-tabs {
  display: flex;
  gap: 8px;
}

.date-picker-wrapper {
  display: flex;
  align-items: center;
}

.tab-btn {
  padding: 8px 20px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: white;
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tab-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
  padding: 24px;
}

.stat-card h3 {
  font-size: 14px;
  color: var(--text-light);
  margin-bottom: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.chart-card {
  margin-bottom: 24px;
}

.chart-card h3 {
  margin-bottom: 20px;
}

.chart-container {
  width: 100%;
  height: 400px;
}

.detail-card h3 {
  margin-bottom: 20px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-info {
  flex: 0 0 200px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-description {
  font-size: 14px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-percentage {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color);
  margin-left: 8px;
}

.detail-bar {
  flex: 1;
  height: 24px;
  background: var(--bg-color);
  border-radius: 12px;
  overflow: hidden;
}

.detail-bar-fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease;
}

.detail-duration {
  flex: 0 0 100px;
  text-align: right;
  font-size: 14px;
  color: var(--text-light);
}
</style>
