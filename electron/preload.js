const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getRecords: (filters) => ipcRenderer.invoke("get-records", filters),
  addRecord: (record) => ipcRenderer.invoke("add-record", record),
  updateRecord: (record) => ipcRenderer.invoke("update-record", record),
  deleteRecord: (id) => ipcRenderer.invoke("delete-record", id),

  getTags: () => ipcRenderer.invoke("get-tags"),
  addTag: (tag) => ipcRenderer.invoke("add-tag", tag),
  updateTag: (tag) => ipcRenderer.invoke("update-tag", tag),
  deleteTag: (id) => ipcRenderer.invoke("delete-tag", id),

  getSetting: (key) => ipcRenderer.invoke("get-setting", key),
  setSetting: (key, value) => ipcRenderer.invoke("set-setting", key, value),

  showNotification: (title, body) =>
    ipcRenderer.invoke("show-notification", title, body),

  getStats: (period) => ipcRenderer.invoke("get-stats", period),

  getStatsByTags: (period) => ipcRenderer.invoke("get-stats-by-tags", period),

  timerStarted: () => ipcRenderer.invoke("timer-started"),
  timerStopped: () => ipcRenderer.invoke("timer-stopped"),
  timerPaused: () => ipcRenderer.invoke("timer-paused"),
});
