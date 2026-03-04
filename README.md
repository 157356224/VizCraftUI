# Vue 3 Online Graphic Editor

一个基于 **Vue 3** + **TypeScript** + **Vite** 构建的现代化在线图形编辑器。它提供了一个无限画布环境，支持拖拽设计、图层管理、属性编辑以及代码导出功能，旨在为开发者提供类似 Figma 的设计体验，并能直接生成代码。

![Vue 3](https://img.shields.io/badge/Vue-3.0+-4FC08D?style=flat&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat&logo=vite)
![Pinia](https://img.shields.io/badge/Pinia-2.0+-FFE46B?style=flat&logo=pinia)

## ✨ 核心特性 (Features)

- **♾️ 无限画布 (Infinite Canvas)**
  - 支持无限平移 (Panning) 和 缩放 (Zooming)。
  - 提供标尺和网格辅助系统。
  - **智能吸附**: 拖拽元素时自动显示对齐辅助线，实现像素级对齐。

- **🎨 强大的元素系统**
  - **多种类型**: 支持 Frame (容器)、Rect (矩形)、Text (文本)、Image (图片) 等基础元素。
  - **递归嵌套**: 支持 Frame 嵌套，构建复杂的组件树结构。
  - **直接编辑**: 双击文本元素即可直接在画布上进行编辑。

- **Layer 图层管理**
  - **树状结构**: 清晰展示元素层级关系。
  - **交互操作**: 支持图层拖拽排序、锁定/解锁、显示/隐藏。
  - **重命名**: 双击图层名称即可重命名。

- **🎛️ 精细属性控制 (Property Panel)**
  - **几何属性**: 精确控制坐标 (X/Y)、尺寸 (W/H)、旋转角度。
  - **外观样式**: 支持填充颜色、描边、圆角（支持独立圆角设置）、不透明度。
  - **排版工具**: 字体大小、行高、字间距、对齐方式等文本属性调节。

- **🛠️ 生产力工具**
  - **历史记录**: 完整的 撤销 (Undo) / 重做 (Redo) 系统，支持最多 50 步操作回溯。
  - **代码导出**: 一键将选中的设计稿导出为 `.uvue` 代码片段，自动转换 px 为 rpx/百分比，助力快速开发。

## 🛠️ 技术栈 (Tech Stack)

- **核心框架**: [Vue 3](https://vuejs.org/) (Composition API)
- **开发语言**: [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **样式处理**: Sass (SCSS)
- **图标库**: [Lucide Vue Next](https://lucide.dev/)

## 🚀 快速开始 (Quick Start)

### 环境要求
- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-username/vue3-graphic-editor.git

# 进入目录
cd vue3-graphic-editor

# 安装依赖
npm install
```

### 启动开发服务器

```bash
npm run dev
```
访问 http://localhost:5173 即可看到编辑器界面。

### 构建生产版本

```bash
npm run build
```

## 📂 项目结构 (Project Structure)

```text
src/
├── components/
│   └── Editor/             # 编辑器核心组件
│       ├── CanvasElement.vue   # 递归渲染组件 (Frame, Rect, Text...)
│       ├── EditorLayout.vue    # 主布局 (左侧图层、中间画布、右侧属性)
│       ├── InfiniteCanvas.vue  # 无限画布逻辑 (缩放、平移、事件分发)
│       ├── LayerPanel.vue      # 图层面板容器
│       ├── LayerTree.vue       # 递归图层树组件
│       ├── PropertyPanel.vue   # 属性编辑面板
│       └── Toolbar.vue         # 顶部/底部工具栏
├── stores/
│   └── editor.ts           # Pinia store (状态管理、历史记录、选中逻辑)
├── types/
│   └── index.ts            # TypeScript 类型定义
├── utils/
│   └── snapping.ts         # 智能吸附算法实现
├── App.vue                 # 应用入口
└── main.ts                 # 全局配置
```

## 📖 操作指南

1.  **创建元素**: 点击底部工具栏的图标（矩形、文本、图片等），在画布上拖拽生成。
2.  **选择元素**: 点击画布上的元素进行单选，按住 `Shift` 点击进行多选，或在空白处拖拽进行框选。
3.  **移动画布**: 按住 `空格键` + 鼠标左键拖拽，或直接使用鼠标中键拖拽。
4.  **缩放画布**: 使用 `Ctrl` (Mac 为 `Cmd`) + 鼠标滚轮进行缩放。
5.  **导出代码**: 选中一个 Frame 容器，点击属性面板顶部的 "Export Code" 按钮。

## 🤝 贡献 (Contributing)

欢迎提交 Issue 和 Pull Request！

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request

## 📄 许可证 (License)

[MIT](./LICENSE) License © 2024 Your Name
