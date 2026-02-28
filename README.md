# Update Time on Edit - Obsidian 插件

## 项目概述

这是一个 Obsidian 插件，用于自动同步文件的创建时间和修改时间到 front matter 元数据中。

### 核心功能
- 自动将文件的 `mtime`（最后修改时间）同步到 front matter 属性（默认为 `updated`）
- 自动将文件的 `ctime`（创建时间）同步到 front matter 属性（默认为 `created`）
- 支持自定义日期格式，默认使用 Obsidian 属性显示格式
- 支持字符串和数字属性类型（数字类型适用于 Unix 时间戳）
- 支持忽略特定文件夹（适用于模板文件）
- **支持忽略特定笔记文件（新增功能）**
- 支持忽略创建属性的文件夹
- 支持桌面端和移动端
- **界面已完全汉化**

### 技术栈
- **语言**: TypeScript
- **构建工具**: esbuild
- **日期处理**: date-fns
- **哈希计算**: js-sha256
- **UI 组件**: @popperjs/core
- **响应式**: rxjs

## 项目结构

```
src/
├── main.ts              # 插件主入口，定义 UpdateTimeOnSavePlugin 类
├── Settings.ts          # 设置界面和配置定义
├── utils.ts             # 工具函数
├── UpdateAllModal.ts    # 批量更新所有文件的模态框
├── UpdateAllCacheData.ts # 批量填充哈希缓存的模态框
└── suggesters/
    ├── FolderSuggester.ts # 文件夹选择建议器
    ├── FileSuggester.ts   # 文件选择建议器（新增）
    └── suggest.ts        # 基础输入建议器类
```

## 构建和运行

### 开发模式
```bash
yarn dev
# 或
npm run dev
```
开发模式会启动监听，自动重新编译。如需同步到本地 Obsidian 仓库，设置环境变量 `OBSIDIAN_VAULT` 指向你的仓库路径。

### 生产构建
```bash
yarn build
# 或
npm run build
```
构建输出到 `dist/` 目录，包含 `main.js`、`manifest.json` 和 `styles.css`。

### 代码格式化
```bash
yarn format:write    # 格式化代码
yarn format:check    # 检查格式
```

### 版本更新
```bash
yarn version
```
自动更新 `manifest.json` 和 `versions.json` 中的版本号。

## 开发约定

### 代码风格
- 使用 Prettier 进行代码格式化
- TypeScript 严格模式 (`strict: true`)
- 目标 ES6，模块系统为 ESNext

### 插件架构
- 主插件类 `UpdateTimeOnSavePlugin` 继承自 Obsidian 的 `Plugin` 类
- 设置面板 `UpdateTimeOnEditSettingsTab` 继承自 `PluginSettingTab`
- 使用 Obsidian API 的 `processFrontMatter` 方法安全地修改 front matter

### 设置配置
默认设置定义在 `DEFAULT_SETTINGS` 常量中：
```typescript
{
  dateFormat: "yyyy-MM-dd'T'HH:mm",
  enableNumberProperties: false,
  enableCreateTime: true,
  headerUpdated: 'updated',
  headerCreated: 'created',
  minMinutesBetweenSaves: 1,
  ignoreGlobalFolder: [],      // 排除的文件夹列表
  ignoreCreatedFolder: [],     // 排除创建时间更新的文件夹
  ignoreFiles: [],             // 排除的笔记文件列表（新增）
  enableExperimentalHash: false,
  fileHashMap: {},
}
```

### 关键文件说明

- **main.ts**: 插件核心逻辑
  - `handleFileChange()`: 处理文件变更，更新 front matter
  - `shouldFileBeIgnored()`: 判断文件是否应被忽略
  - `setupOnEditHandler()`: 注册文件事件监听器

- **Settings.ts**: 设置界面
  - 日期格式设置（使用 date-fns 格式）
  - 排除文件夹设置
  - 实验性哈希匹配功能

### 调试
在开发模式下，使用 `this.log()` 方法输出调试信息，日志前缀为 `[UTOE]:`。

### 注意事项
1. 插件会修改文件，建议用户在使用前备份仓库
2. 外部文件变更也会触发更新（基于文件系统的 ctime/mtime）
3. Canvas 文件和 Excalidraw 文件会被自动忽略
4. 空文件会被忽略

---

<details>
  <summary>原始内容</summary>

# Update time on edit plugin 编辑插件的更新时间

该插件更新保存文件的元数据及其更新时间，以及创建时间（如果没有）（对于新文件有用）。

以下是该插件提供的功能列表：
- 保持属性键中的“mtime”（上次修改时间）同步（默认为“updated”）
- 与属性键中的“ctime”（文件创建时间）保持同步（默认为“created”）
- 自定义日期格式，属性显示默认为黑曜石日期格式
- 支持字符串和数字属性数据类型，后者对于 Unix 时间戳很有用
- 忽略所有更新的文件夹，对模板文件有用
- 忽略创建属性的文件夹
- 适用于移动设备和桌面设备

该插件将从黑曜石中读取“ctime”和“mtime”，从而读取文件系统。 **如果文件从外部源发生更改，标头密钥将被更新**。

请记住备份您的保管库，因为此插件会修改文件。
  
