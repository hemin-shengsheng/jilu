const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// 设置Electron数据存储到exe同级目录的jilu-data文件夹
function getCustomUserDataPath() {
  let dataPath;

  try {
    // 使用process.execPath获取实际的exe路径（portable模式下也能正确获取）
    const exePath = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath("exe");
    const exeDir = path.dirname(exePath);
    dataPath = path.join(exeDir, "jilu-data");

    // 测试是否有写入权限
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    const testFile = path.join(dataPath, "test.tmp");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
  } catch (error) {
    // 如果exe同级目录没有权限，使用用户文档目录作为fallback
    dataPath = app.getPath("userData");
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
  }

  return dataPath;
}

const customUserDataPath = getCustomUserDataPath();
app.setPath("userData", customUserDataPath);

let mainWindow = null;
let db = null;
let reminderTimer = null;
let lastActionTime = Date.now();
let isTimerRunning = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "default",
    backgroundColor: "#FFF8F0",
  });

  const isDev =
    process.env.NODE_ENV === "development" || !!process.env.VITE_DEV_SERVER_URL;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function initDatabase() {
  const dbPath = path.join(app.getPath("userData"), "jilu.db");

  try {
    db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS time_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER DEFAULT 0,
        description TEXT,
        tags TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#FF8C42',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    const defaultSettings = [
      ["daily_goal", "3600"],
      ["reminder_enabled", "true"],
      ["reminder_interval", "7200"],
    ];

    const insertSetting = db.prepare(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
    );
    defaultSettings.forEach(([key, value]) => {
      insertSetting.run(key, value);
    });
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();
  startReminderSystem();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) db.close();
    app.quit();
  }
});

ipcMain.handle("get-records", (event, filters) => {
  let query = "SELECT * FROM time_records WHERE 1=1";
  const params = [];

  if (filters.startDate) {
    query += " AND date(start_time) >= date(?)";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += " AND date(start_time) <= date(?)";
    params.push(filters.endDate);
  }

  query += " ORDER BY start_time DESC";

  const stmt = db.prepare(query);
  return stmt.all(...params);
});

ipcMain.handle("get-stats-by-tags", (event, period) => {
  let query = "";
  const params = [];

  if (period === "day") {
    query = `
      SELECT tags, SUM(duration) as total_duration
      FROM time_records
      WHERE date(start_time) = date('now', 'localtime')
      GROUP BY tags
      ORDER BY total_duration DESC
    `;
  } else if (period === "week") {
    query = `
      SELECT tags, SUM(duration) as total_duration
      FROM time_records
      WHERE date(start_time) >= date('now', '-7 days', 'localtime')
      GROUP BY tags
      ORDER BY total_duration DESC
    `;
  } else if (period === "month") {
    query = `
      SELECT tags, SUM(duration) as total_duration
      FROM time_records
      WHERE date(start_time) >= date('now', '-30 days', 'localtime')
      GROUP BY tags
      ORDER BY total_duration DESC
    `;
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
});

ipcMain.handle("add-record", (event, record) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO time_records (start_time, end_time, duration, description, tags)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      record.start_time,
      record.end_time,
      record.duration,
      record.description,
      JSON.stringify(record.tags || []),
    );
    return result.lastInsertRowid;
  } catch (error) {
    console.error("Error inserting record:", error);
    throw error;
  }
});

ipcMain.handle("update-record", (event, record) => {
  const stmt = db.prepare(`
    UPDATE time_records
    SET start_time = ?, end_time = ?, duration = ?, description = ?, tags = ?
    WHERE id = ?
  `);
  stmt.run(
    record.start_time,
    record.end_time,
    record.duration,
    record.description,
    JSON.stringify(record.tags || []),
    record.id,
  );
  return true;
});

ipcMain.handle("delete-record", (event, id) => {
  const stmt = db.prepare("DELETE FROM time_records WHERE id = ?");
  stmt.run(id);
  return true;
});

ipcMain.handle("get-tags", () => {
  const stmt = db.prepare("SELECT * FROM tags ORDER BY created_at DESC");
  return stmt.all();
});

ipcMain.handle("add-tag", (event, tag) => {
  const stmt = db.prepare("INSERT INTO tags (name, color) VALUES (?, ?)");
  const result = stmt.run(tag.name, tag.color || "#FF8C42");
  return result.lastInsertRowid;
});

ipcMain.handle("update-tag", (event, tag) => {
  const stmt = db.prepare("UPDATE tags SET name = ?, color = ? WHERE id = ?");
  stmt.run(tag.name, tag.color, tag.id);
  return true;
});

ipcMain.handle("delete-tag", (event, id) => {
  const stmt = db.prepare("DELETE FROM tags WHERE id = ?");
  stmt.run(id);
  return true;
});

ipcMain.handle("get-setting", (event, key) => {
  const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
  const result = stmt.get(key);
  return result ? result.value : null;
});

ipcMain.handle("set-setting", (event, key, value) => {
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
  );
  stmt.run(key, value);
  return true;
});

ipcMain.handle("show-notification", (event, title, body) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
    });
    notification.show();
    return true;
  }
  return false;
});

ipcMain.handle("get-stats", (event, period) => {
  let query = "";
  const params = [];

  if (period === "day") {
    query = `
      SELECT description, SUM(duration) as total_duration
      FROM time_records
      WHERE date(start_time) = date('now', 'localtime')
      GROUP BY description
      ORDER BY total_duration DESC
    `;
  } else if (period === "week") {
    query = `
      SELECT description, SUM(duration) as total_duration
      FROM time_records
      WHERE date(start_time) >= date('now', '-7 days', 'localtime')
      GROUP BY description
      ORDER BY total_duration DESC
    `;
  } else if (period === "month") {
    query = `
      SELECT description, SUM(duration) as total_duration
      FROM time_records
      WHERE date(start_time) >= date('now', '-30 days', 'localtime')
      GROUP BY description
      ORDER BY total_duration DESC
    `;
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
});

function startReminderSystem() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
  }

  reminderTimer = setInterval(() => {
    checkReminders();
  }, 60000);
}

async function checkReminders() {
  const reminderEnabled = await getSettingValue("reminder_enabled");
  if (reminderEnabled !== "true") return;

  checkIdleReminder();
  checkDailyGoalReminder();
}

async function checkIdleReminder() {
  if (isTimerRunning) return;

  const reminderInterval =
    parseInt(await getSettingValue("reminder_interval")) || 7200;
  const idleTime = (Date.now() - lastActionTime) / 1000;

  if (idleTime >= reminderInterval) {
    showNotification("迹录提醒", "已经很久没有开始计时了，该开始学习啦！");
    lastActionTime = Date.now();
  }
}

async function checkDailyGoalReminder() {
  const dailyGoal = parseInt(await getSettingValue("daily_goal")) || 3600;
  const todayTotal = getTodayTotalDuration();

  if (todayTotal >= dailyGoal && todayTotal < dailyGoal + 60) {
    showNotification("迹录提醒", "恭喜！已完成今日目标时长！");
  }
}

function getTodayTotalDuration() {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) as total
    FROM time_records
    WHERE date(start_time) = date('now', 'localtime')
  `);
  const result = stmt.get();
  return result ? result.total : 0;
}

function getSettingValue(key) {
  const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
  const result = stmt.get(key);
  return result ? result.value : null;
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
    });
    notification.show();
  }
}

ipcMain.handle("timer-started", () => {
  isTimerRunning = true;
  lastActionTime = Date.now();
  return true;
});

ipcMain.handle("timer-stopped", () => {
  isTimerRunning = false;
  lastActionTime = Date.now();
  return true;
});

ipcMain.handle("timer-paused", () => {
  lastActionTime = Date.now();
  return true;
});
