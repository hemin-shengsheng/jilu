# 迹录 - 时间记录应用

一个轻量级的时间记录桌面应用，帮助您追踪和管理日常时间使用情况。

## 功能特性

- ⏱️ **计时功能**：自由开始、暂停、结束计时
- 🏷️ **标签管理**：为时间记录添加自定义标签
- 📊 **统计分析**：按日、周、月查看时间分布（环形图展示）
- 💾 **数据导出**：支持导出时间记录数据
- 🎯 **目标提醒**：设置每日目标时长，桌面通知提醒
- 💾 **本地存储**：所有数据存储在本地，保护隐私（在点击.exe后会在同级目录下生成jilu-data文件夹，数据都在里面，不占用C盘位置）

## 页面展示

占个位，我使用一段时间后再截图放在这里（嘿嘿）

## 技术栈

- **前端框架**：Vue 3 + Composition API
- **桌面框架**：Electron
- **UI组件**：Element Plus
- **数据可视化**：ECharts
- **状态管理**：Pinia
- **数据库**：SQLite (better-sqlite3)
- **构建工具**：Vite

## 项目结构

```
迹录-jilu/
├── electron/           # Electron主进程
│   ├── main.js        # 主进程入口
│   └── preload.js     # 预加载脚本
├── src/               # Vue前端源码
│   ├── views/         # 页面组件
│   ├── stores/        # Pinia状态管理
│   ├── router/        # 路由配置
│   └── assets/        # 静态资源
├── public/             # 打包资源（图标等）
└── release/           # 打包输出目录(执行pnpm run electron:build后生成)
```

## 开发环境

### 前置要求

- Node.js 20+
- pnpm（推荐）或 npm

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run electron:dev
```

### 打包应用

```bash
pnpm run electron:build
```

打包后的可执行文件位于 `release` 目录。

## 数据存储

应用数据存储在exe同级目录的 `jilu-data` 文件夹中：

- 数据库文件：`jilu.db`
- 应用缓存：自动管理

如果exe目录无写入权限，数据会自动存储到用户文档目录。

## 许可证

MIT
