<template>
  <div class="timer-page">
    <div class="container">
      <div class="timer-card card">
        <div class="timer-display">
          <div class="time-block">
            <span class="time-value">{{ timerStore.formattedTime.hours }}</span>
            <span class="time-label">时</span>
          </div>
          <span class="time-separator">:</span>
          <div class="time-block">
            <span class="time-value">{{
              timerStore.formattedTime.minutes
            }}</span>
            <span class="time-label">分</span>
          </div>
          <span class="time-separator">:</span>
          <div class="time-block">
            <span class="time-value">{{
              timerStore.formattedTime.seconds
            }}</span>
            <span class="time-label">秒</span>
          </div>
        </div>

        <div class="timer-controls">
          <button
            v-if="!timerStore.isRunning"
            class="btn-primary control-btn"
            @click="handleStart"
          >
            开始计时
          </button>
          <template v-else>
            <button
              v-if="!timerStore.isPaused"
              class="btn-secondary control-btn"
              @click="handlePause"
            >
              暂停
            </button>
            <button
              v-else
              class="btn-primary control-btn"
              @click="handleResume"
            >
              继续
            </button>
            <button
              class="btn-primary control-btn stop-btn"
              @click="handleStop"
            >
              结束并保存
            </button>
          </template>
        </div>
      </div>

      <div class="info-card card">
        <h3>事项描述</h3>
        <textarea
          v-model="description"
          placeholder="这段时间在做什么..."
          rows="3"
          class="description-input"
        ></textarea>

        <h3 class="mt-3">标签</h3>
        <div class="tags-section">
          <div class="tags-list">
            <span
              v-for="tag in tags"
              :key="tag.id"
              class="tag-item"
              :class="{ active: selectedTags.includes(tag.id) }"
              :style="{ borderColor: tag.color }"
              @click="toggleTag(tag.id)"
            >
              {{ tag.name }}
            </span>
          </div>
          <div class="add-tag-section">
            <input
              v-model="newTagName"
              placeholder="新标签名称"
              class="tag-input"
              @keyup.enter="handleAddTag"
            />
            <input v-model="newTagColor" type="color" class="color-picker" />
            <button class="btn-secondary add-tag-btn" @click="handleAddTag">
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useTimerStore } from "../stores/timer";

const timerStore = useTimerStore();
const description = ref("");
const tags = ref([]);
const selectedTags = ref([]);
const newTagName = ref("");
const newTagColor = ref("#FF8C42");

onMounted(async () => {
  await loadTags();
});

async function loadTags() {
  if (window.electronAPI) {
    try {
      tags.value = await window.electronAPI.getTags();
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  } else {
    console.warn("window.electronAPI not available");
  }
}

function handleStart() {
  timerStore.setDescription(description.value);
  timerStore.setTags(selectedTags.value);
  timerStore.startTimer();
  if (window.electronAPI) {
    window.electronAPI.timerStarted();
  }
}

function handlePause() {
  timerStore.pauseTimer();
  if (window.electronAPI) {
    window.electronAPI.timerPaused();
  }
}

function handleResume() {
  timerStore.startTimer();
  if (window.electronAPI) {
    window.electronAPI.timerStarted();
  }
}

async function handleStop() {
  const record = await timerStore.stopTimer();

  if (record && window.electronAPI) {
    record.description = description.value;
    record.tags = JSON.parse(JSON.stringify(selectedTags.value));

    try {
      const result = await window.electronAPI.addRecord(record);
      await window.electronAPI.timerStopped();
      description.value = "";
      selectedTags.value = [];
    } catch (error) {
      console.error("Error saving record:", error);
    }
  }
}

function toggleTag(tagId) {
  const index = selectedTags.value.indexOf(tagId);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tagId);
  }
}

async function handleAddTag() {
  if (!newTagName.value.trim()) return;

  if (window.electronAPI) {
    await window.electronAPI.addTag({
      name: newTagName.value.trim(),
      color: newTagColor.value,
    });
    newTagName.value = "";
    await loadTags();
  }
}
</script>

<style scoped>
.timer-page {
  width: 100%;
}

.timer-card {
  text-align: center;
  padding: 48px 24px;
}

.timer-display {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 40px;
}

.time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-value {
  font-size: 72px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.time-label {
  font-size: 14px;
  color: var(--text-light);
  margin-top: 8px;
}

.time-separator {
  font-size: 56px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0 4px;
}

.timer-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.control-btn {
  min-width: 140px;
  height: 48px;
  font-size: 16px;
}

.stop-btn {
  background: linear-gradient(
    135deg,
    var(--primary-dark),
    var(--primary-color)
  );
}

.info-card {
  padding: 24px;
}

.info-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.description-input {
  resize: none;
  font-family: inherit;
}

.tags-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 6px 16px;
  border: 2px solid;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.tag-item:hover {
  transform: translateY(-2px);
}

.tag-item.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color) !important;
}

.add-tag-section {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tag-input {
  flex: 1;
}

.color-picker {
  width: 48px;
  height: 40px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  padding: 2px;
}

.add-tag-btn {
  padding: 8px 16px;
  font-size: 14px;
}
</style>
