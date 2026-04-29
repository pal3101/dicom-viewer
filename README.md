# 三维CT影像在线查看器

基于 CloudBase + Cornerstone3D 的医学影像在线查看平台。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **影像渲染**: Cornerstone3D (Cornerstone.js v2)
- **DICOM 解析**: dicom-parser
- **后端**: Node.js + Express + TypeScript
- **存储**: CloudBase 云存储 (CDN 分发)
- **数据库**: CloudBase 文档数据库
- **部署**: CloudBase 静态托管（前端）+ 轻量服务器（后端）

## 项目结构

```
dicom-viewer/
├── server/                  # Node.js 后端
│   ├── src/
│   │   ├── index.ts         # Express 入口
│   │   ├── routes/
│   │   │   └── studies.ts   # 病例 API（上传、查询）
│   │   ├── services/
│   │   │   ├── dicom-parser.ts    # DICOM Tag 解析
│   │   │   └── study-indexer.ts   # 自动索引 + 去重
│   │   ├── db/
│   │   │   └── cloudbase.ts # CloudBase DB 操作
│   │   └── types/
│   │       └── index.ts
│   └── package.json
│
├── web/                     # React 前端
│   ├── src/
│   │   ├── config/
│   │   │   └── cloudbase.ts # CloudBase SDK 初始化
│   │   ├── lib/
│   │   │   ├── api.ts               # 后端 API 调用
│   │   │   └── cloudbase-storage.ts # 云存储上传
│   │   ├── viewer/
│   │   │   ├── cornerstone-init.ts           # Cornerstone3D 初始化
│   │   │   ├── cloudbase-datasource-adapter.ts # 数据源适配
│   │   │   └── ohif-config.ts    # 元数据格式转换
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── StudyList.tsx     # 病例列表
│   │   │   ├── StudyViewer.tsx   # 查看器容器
│   │   │   ├── DICOMViewport.tsx # Cornerstone3D 渲染
│   │   │   └── UploadPanel.tsx   # 上传面板
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── ViewerPage.tsx
│   │   │   └── UploadPage.tsx
│   │   └── hooks/
│   │       ├── useStudies.ts
│   │       └── useUpload.ts
│   └── package.json
│
└── package.json             # Monorepo 根配置
```

## 快速开始

### 1. 安装依赖

```bash
cd dicom-viewer
npm install
cd server && npm install && cd ..
cd web && npm install && cd ..
```

### 2. 配置 CloudBase

在 `web/.env` 文件中配置你的 CloudBase 环境 ID：

```env
VITE_CLOUDBASE_ENV_ID=你的-env-id
```

在 `server` 中同样需要配置环境变量：

```bash
# server/.env
CLOUDBASE_ENV_ID=你的-env-id
PORT=3001
```

### 3. 创建数据库集合

在 CloudBase 控制台创建三个集合：
- `studies` — 检查级别元数据
- `series` — 序列级别元数据
- `instances` — 图像实例（含 SOPInstanceUID 用于去重）

### 4. 启动开发服务器

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:server  # 后端: http://localhost:3001
npm run dev:web     # 前端: http://localhost:5173
```

## 部署

### 前端

```bash
cd web
npm run build
# 将 web/dist 部署到 CloudBase 静态托管
```

### 后端

部署到你的轻量服务器，使用 PM2 管理进程：

```bash
cd server
npm run build
pm2 start dist/index.js --name dicom-viewer-api
```

## 功能清单

- [x] DICOM 文件批量上传（拖拽/选择文件）
- [x] 自动解析 DICOM Tag（UID、患者信息、层厚等）
- [x] SOPInstanceUID 去重
- [x] 自动建立 study → series → instance 层级索引
- [x] 病例列表浏览
- [x] DICOM 影像查看（滚动浏览序列）
- [x] 窗宽窗位调节（左键拖拽）
- [x] 平移（右键拖拽）
- [x] 缩放（Ctrl + 滚轮）
- [ ] MPR 三视图（轴状面/矢状面/冠状面）
- [ ] 三维重建渲染（Volume Rendering）
- [ ] 移动端适配优化
- [ ] 螺钉规划工具（后续）

## 架构说明

```
用户上传 DICOM:
  浏览器 → 解析 DICOM Tag → uploadToCloudStorage → CloudBase 云存储 CDN
  浏览器 → POST /api/upload → 后端解析 + 去重 → CloudBase 数据库

用户查看病例:
  浏览器 → GET /api/studies → CloudBase 数据库 → 显示列表
  浏览器 → 选择序列 → preloadSeriesTempURLs → 批量获取临时 URL
  Cornerstone3D → 加载临时 URL → 渲染影像

数据传输路径:
  DICOM 影像: CloudBase 云存储 (CDN) → 用户浏览器（不经过服务器）
  元数据:     CloudBase 数据库 → 后端 API → 用户浏览器
```
