<template>
  <div class="records-page">
    <div class="container">
      <div class="header-section">
        <h2>历史记录</h2>
        <div class="filter-section">
          <input v-model="filterDate" type="date" class="date-filter" />
          <button class="btn-secondary" @click="loadRecords">筛选</button>
          <button class="btn-secondary" @click="clearFilter">清除</button>
        </div>
      </div>

      <div class="records-list">
        <div
          v-for="group in groupedRecords"
          :key="group.date"
          class="record-group"
        >
          <div class="group-header">
            <span class="group-date">{{ formatDate(group.date) }}</span>
            <span class="group-total">{{
              formatDuration(group.totalDuration)
            }}</span>
          </div>

          <div
            v-for="record in group.records"
            :key="record.id"
            class="record-item card"
          >
            <div class="record-main">
              <div class="record-time">
                <span class="time-range">
                  {{ formatTime(record.start_time) }} -
                  {{ formatTime(record.end_time) }}
                </span>
                <span class="duration">{{
                  formatDuration(record.duration)
                }}</span>
              </div>
              <div class="record-description">
                {{ record.description || "未填写描述" }}
              </div>
              <div class="record-tags">
                <span
                  v-for="tag in parseTags(record.tags)"
                  :key="tag.id"
                  class="record-tag"
                  :style="{ backgroundColor: tag.color }"
                >
                  {{ tag.name }}
                </span>
              </div>
            </div>
            <div class="record-actions">
              <button class="action-btn" @click="handleEdit(record)">
                编辑
              </button>
              <button
                class="action-btn delete"
                @click="handleDelete(record.id)"
              >
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-if="records.length === 0" class="empty-state">
          <p>暂无记录</p>
        </div>
      </div>
    </div>

    <div v-if="showEditDialog" class="dialog-overlay" @click="closeEditDialog">
      <div class="dialog" @click.stop>
        <h3>编辑记录</h3>
        <div class="form-group">
          <label>事项描述</label>
          <textarea v-model="editForm.description" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>开始时间</label>
          <input v-model="editForm.start_time" type="datetime-local" />
        </div>
        <div class="form-group">
          <label>结束时间</label>
          <input v-model="editForm.end_time" type="datetime-local" />
        </div>
        <div class="form-group">
          <label>标签</label>
          <div class="edit-tags-list">
            <span
              v-for="tag in allTags"
              :key="tag.id"
              class="edit-tag-item"
              :class="{ active: editSelectedTags.includes(tag.id) }"
              :style="{ borderColor: tag.color }"
              @click="toggleEditTag(tag.id)"
            >
              {{ tag.name }}
            </span>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="closeEditDialog">取消</button>
          <button class="btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const records = ref([]);
const filterDate = ref("");
const showEditDialog = ref(false);
const editForm = ref({});
const allTags = ref([]);
const editSelectedTags = ref([]);

onMounted(() => {
  loadRecords();
  loadTags();
});

async function loadTags() {
  if (window.electronAPI) {
    allTags.value = await window.electronAPI.getTags();
  }
}

async function loadRecords() {
  if (window.electronAPI) {
    const filters = {};
    if (filterDate.value) {
      filters.startDate = filterDate.value;
      filters.endDate = filterDate.value;
    }
    records.value = await window.electronAPI.getRecords(filters);
  }
}

function clearFilter() {
  filterDate.value = "";
  loadRecords();
}

const groupedRecords = computed(() => {
  const groups = {};

  records.value.forEach((record) => {
    const date = record.start_time.split("T")[0];
    if (!groups[date]) {
      groups[date] = {
        date,
        records: [],
        totalDuration: 0,
      };
    }
    groups[date].records.push(record);
    groups[date].totalDuration += record.duration;
  });

  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
});

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "今天";
  } else if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "昨天";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

function parseTags(tagsStr) {
  try {
    const tagIds = JSON.parse(tagsStr || "[]");
    if (!Array.isArray(tagIds)) return [];

    // 根据tag id获取完整的tag信息
    return tagIds
      .map((id) => {
        const tag = allTags.value.find((t) => t.id === id);
        return tag ? { id: tag.id, name: tag.name, color: tag.color } : null;
      })
      .filter((tag) => tag !== null);
  } catch {
    return [];
  }
}

function handleEdit(record) {
  // 将ISO格式的日期转换为datetime-local格式
  const startTime = new Date(record.start_time);
  const endTime = new Date(record.end_time);

  editForm.value = {
    ...record,
    start_time: formatDateTimeLocal(startTime),
    end_time: formatDateTimeLocal(endTime),
  };

  // 解析已选择的标签
  try {
    const tagIds = JSON.parse(record.tags || "[]");
    editSelectedTags.value = Array.isArray(tagIds) ? [...tagIds] : [];
  } catch {
    editSelectedTags.value = [];
  }

  showEditDialog.value = true;
}

function toggleEditTag(tagId) {
  const index = editSelectedTags.value.indexOf(tagId);
  if (index > -1) {
    editSelectedTags.value.splice(index, 1);
  } else {
    editSelectedTags.value.push(tagId);
  }
}

function formatDateTimeLocal(date) {
  // 转换为本地时间并格式化为 datetime-local 格式
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function closeEditDialog() {
  showEditDialog.value = false;
  editForm.value = {};
}

async function saveEdit() {
  if (window.electronAPI) {
    const start = new Date(editForm.value.start_time);
    const end = new Date(editForm.value.end_time);

    const recordToUpdate = {
      id: editForm.value.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration: Math.floor((end - start) / 1000),
      description: editForm.value.description,
      tags: JSON.parse(JSON.stringify(editSelectedTags.value)),
    };

    await window.electronAPI.updateRecord(recordToUpdate);
    await loadRecords();
    closeEditDialog();
  }
}

async function handleDelete(id) {
  if (confirm("确定要删除这条记录吗？")) {
    if (window.electronAPI) {
      await window.electronAPI.deleteRecord(id);
      await loadRecords();
    }
  }
}
</script>

<style scoped>
.records-page {
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

.filter-section {
  display: flex;
  gap: 8px;
}

.date-filter {
  width: 180px;
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
}

.record-group {
  margin-bottom: 32px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: var(--shadow);
}

.group-date {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.group-total {
  font-size: 14px;
  color: var(--primary-color);
  font-weight: 600;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  margin-bottom: 12px;
}

.record-main {
  flex: 1;
}

.record-time {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.time-range {
  font-size: 14px;
  color: var(--text-light);
}

.duration {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color);
}

.record-description {
  font-size: 15px;
  color: var(--text-color);
  margin-bottom: 8px;
}

.record-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.record-tag {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
}

.record-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  background: var(--bg-color);
  color: var(--text-color);
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: var(--primary-light);
  color: white;
}

.action-btn.delete:hover {
  background: #ff6b6b;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-light);
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog h3 {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-color);
}

.form-group input,
.form-group textarea {
  width: 100%;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.edit-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.edit-tag-item {
  padding: 6px 16px;
  border: 2px solid;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.edit-tag-item:hover {
  transform: translateY(-2px);
}

.edit-tag-item.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color) !important;
}
</style>
