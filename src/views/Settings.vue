<template>
  <div class="settings-page">
    <div class="container">
      <h2>设置</h2>

      <div class="settings-section card">
        <h3>目标设置</h3>
        <div class="setting-item">
          <label>每日目标时长（小时）</label>
          <input
            v-model.number="dailyGoal"
            type="number"
            min="0"
            max="24"
            step="0.5"
            class="setting-input"
            @change="saveDailyGoal"
          />
        </div>
        <p class="setting-hint">设置每天的目标学习时长，达到目标时会收到提醒</p>
      </div>

      <div class="settings-section card">
        <h3>提醒设置</h3>
        <div class="setting-item">
          <label>启用提醒</label>
          <label class="switch">
            <input
              v-model="reminderEnabled"
              type="checkbox"
              @change="saveReminderEnabled"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <label>未行动提醒间隔（小时）</label>
          <input
            v-model.number="reminderInterval"
            type="number"
            min="0.5"
            max="12"
            step="0.5"
            class="setting-input"
            @change="saveReminderInterval"
          />
        </div>
        <p class="setting-hint">超过设定时间未开始计时，将收到桌面通知提醒</p>
      </div>

      <div class="settings-section card">
        <h3>数据管理</h3>
        <div class="export-section">
          <div class="export-item">
            <label>导出时间范围</label>
            <div class="date-range">
              <input v-model="exportStartDate" type="date" class="date-input" />
              <span>至</span>
              <input v-model="exportEndDate" type="date" class="date-input" />
            </div>
          </div>
          <div class="export-actions">
            <button class="btn-secondary" @click="exportToCSV">
              导出为 CSV
            </button>
            <button class="btn-primary" @click="exportToExcel">
              导出为 Excel
            </button>
          </div>
        </div>
      </div>

      <div class="settings-section card">
        <h3>标签管理</h3>
        <div class="tags-management">
          <div v-for="tag in tags" :key="tag.id" class="tag-management-item">
            <input
              v-model="tag.name"
              class="tag-name-input"
              @blur="updateTag(tag)"
            />
            <input
              v-model="tag.color"
              type="color"
              class="color-picker"
              @change="updateTag(tag)"
            />
            <button class="delete-tag-btn" @click="deleteTag(tag.id)">
              删除
            </button>
          </div>
        </div>
      </div>

      <div class="settings-section card">
        <h3>关于</h3>
        <div class="about-info">
          <p><strong>迹录</strong> - 时间记录应用</p>
          <p>版本：1.0.0</p>
          <p>轻量级时间追踪工具，帮助你记录和统计每天的时间分配</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const dailyGoal = ref(1);
const reminderEnabled = ref(true);
const reminderInterval = ref(2);
const exportStartDate = ref("");
const exportEndDate = ref("");
const tags = ref([]);

onMounted(async () => {
  await loadSettings();
  await loadTags();
});

async function loadSettings() {
  if (window.electronAPI) {
    const goal = await window.electronAPI.getSetting("daily_goal");
    const enabled = await window.electronAPI.getSetting("reminder_enabled");
    const interval = await window.electronAPI.getSetting("reminder_interval");

    if (goal) dailyGoal.value = parseInt(goal) / 3600;
    if (enabled) reminderEnabled.value = enabled === "true";
    if (interval) reminderInterval.value = parseInt(interval) / 3600;
  }
}

async function loadTags() {
  if (window.electronAPI) {
    tags.value = await window.electronAPI.getTags();
  }
}

async function saveDailyGoal() {
  if (window.electronAPI) {
    await window.electronAPI.setSetting(
      "daily_goal",
      String(dailyGoal.value * 3600),
    );
  }
}

async function saveReminderEnabled() {
  if (window.electronAPI) {
    await window.electronAPI.setSetting(
      "reminder_enabled",
      String(reminderEnabled.value),
    );
  }
}

async function saveReminderInterval() {
  if (window.electronAPI) {
    await window.electronAPI.setSetting(
      "reminder_interval",
      String(reminderInterval.value * 3600),
    );
  }
}

async function exportToCSV() {
  if (!window.electronAPI) return;

  const records = await window.electronAPI.getRecords({
    startDate: exportStartDate.value,
    endDate: exportEndDate.value,
  });

  if (records.length === 0) {
    alert("没有可导出的记录");
    return;
  }

  // 获取所有标签
  const allTags = await window.electronAPI.getTags();
  const tagMap = {};
  allTags.forEach((tag) => {
    tagMap[tag.id] = tag.name;
  });

  let csv = "开始时间,结束时间,时长(秒),事项描述,标签\n";
  records.forEach((record) => {
    let tagNames = "";
    try {
      const tagIds = JSON.parse(record.tags || "[]");
      if (Array.isArray(tagIds) && tagIds.length > 0) {
        tagNames = tagIds
          .map((id) => tagMap[id] || "")
          .filter((name) => name)
          .join(";");
      }
    } catch (e) {
      console.error("Error parsing tags:", e);
    }
    csv += `${record.start_time},${record.end_time},${record.duration},"${record.description || ""}","${tagNames}"\n`;
  });

  downloadFile(csv, "jilu-export.csv", "text/csv");
}

async function exportToExcel() {
  if (!window.electronAPI) return;

  const records = await window.electronAPI.getRecords({
    startDate: exportStartDate.value,
    endDate: exportEndDate.value,
  });

  if (records.length === 0) {
    alert("没有可导出的记录");
    return;
  }

  // 获取所有标签
  const allTags = await window.electronAPI.getTags();
  const tagMap = {};
  allTags.forEach((tag) => {
    tagMap[tag.id] = tag.name;
  });

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"></head>
    <body>
    <table border="1">
      <tr>
        <th>开始时间</th>
        <th>结束时间</th>
        <th>时长(秒)</th>
        <th>事项描述</th>
        <th>标签</th>
      </tr>
  `;

  records.forEach((record) => {
    let tagNames = "";
    try {
      const tagIds = JSON.parse(record.tags || "[]");
      if (Array.isArray(tagIds) && tagIds.length > 0) {
        tagNames = tagIds
          .map((id) => tagMap[id] || "")
          .filter((name) => name)
          .join(";");
      }
    } catch (e) {
      console.error("Error parsing tags:", e);
    }

    html += `
      <tr>
        <td>${record.start_time}</td>
        <td>${record.end_time}</td>
        <td>${record.duration}</td>
        <td>${record.description || ""}</td>
        <td>${tagNames}</td>
      </tr>
    `;
  });

  html += "</table></body></html>";

  downloadFile(html, "jilu-export.xls", "application/vnd.ms-excel");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function updateTag(tag) {
  if (window.electronAPI) {
    await window.electronAPI.updateTag(tag);
    await loadTags();
  }
}

async function deleteTag(id) {
  if (confirm("确定要删除这个标签吗？")) {
    if (window.electronAPI) {
      await window.electronAPI.deleteTag(id);
      await loadTags();
    }
  }
}
</script>

<style scoped>
.settings-page {
  width: 100%;
}

.settings-page h2 {
  margin-bottom: 24px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3 {
  font-size: 18px;
  margin-bottom: 20px;
  color: var(--text-color);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.setting-item label {
  font-size: 15px;
  color: var(--text-color);
}

.setting-input {
  width: 120px;
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
}

.setting-hint {
  font-size: 13px;
  color: var(--text-light);
  margin-top: 8px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.export-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 15px;
  color: var(--text-color);
}

.date-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
}

.export-actions {
  display: flex;
  gap: 12px;
}

.tags-management {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tag-management-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tag-name-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
}

.color-picker {
  width: 48px;
  height: 36px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  padding: 2px;
}

.delete-tag-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #ff6b6b;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-tag-btn:hover {
  background: #ff4757;
}

.about-info {
  line-height: 1.8;
  color: var(--text-color);
}

.about-info p {
  margin-bottom: 8px;
}
</style>
