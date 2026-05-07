import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useTimerStore = defineStore("timer", () => {
  const isRunning = ref(false);
  const isPaused = ref(false);
  const startTime = ref(null);
  const pausedTime = ref(0);
  const elapsedBeforePause = ref(0);
  const currentDescription = ref("");
  const currentTags = ref([]);
  const timerInterval = ref(null);

  const currentTime = ref(Date.now());

  const elapsedTime = computed(() => {
    if (!isRunning.value || isPaused.value) {
      return elapsedBeforePause.value;
    }
    return (
      Math.floor((currentTime.value - startTime.value) / 1000) +
      elapsedBeforePause.value
    );
  });

  const formattedTime = computed(() => {
    const totalSeconds = elapsedTime.value;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
      display: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    };
  });

  function startTimer() {
    if (isRunning.value && !isPaused.value) return;

    if (isPaused.value) {
      isPaused.value = false;
      startTime.value = Date.now();
      currentTime.value = Date.now(); // 立即更新currentTime，避免出现负数
    } else {
      isRunning.value = true;
      startTime.value = Date.now();
      currentTime.value = Date.now(); // 立即更新currentTime
      elapsedBeforePause.value = 0;
    }

    timerInterval.value = setInterval(() => {
      currentTime.value = Date.now();
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning.value || isPaused.value) return;

    // 计算实际已经流逝的时间
    const actualElapsed =
      Math.floor((Date.now() - startTime.value) / 1000) +
      elapsedBeforePause.value;
    elapsedBeforePause.value = actualElapsed;

    isPaused.value = true;
    clearInterval(timerInterval.value);
  }

  async function stopTimer() {
    if (!isRunning.value) return null;

    clearInterval(timerInterval.value);

    const record = {
      start_time: new Date(
        startTime.value - elapsedBeforePause.value * 1000,
      ).toISOString(),
      end_time: new Date().toISOString(),
      duration: elapsedTime.value,
      description: currentDescription.value,
      tags: currentTags.value,
    };

    isRunning.value = false;
    isPaused.value = false;
    startTime.value = null;
    elapsedBeforePause.value = 0;
    currentDescription.value = "";
    currentTags.value = [];

    return record;
  }

  function setDescription(description) {
    currentDescription.value = description;
  }

  function setTags(tags) {
    currentTags.value = tags;
  }

  return {
    isRunning,
    isPaused,
    startTime,
    currentDescription,
    currentTags,
    elapsedTime,
    formattedTime,
    startTimer,
    pauseTimer,
    stopTimer,
    setDescription,
    setTags,
  };
});
