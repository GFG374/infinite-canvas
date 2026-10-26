# 官方（basketikun/infinite-canvas）更新同步计划

> 本地基线：`tigerowo/infinite-canvas`（Next 16 + Go 1.25）
> 官方基线：`basketikun/infinite-canvas` v0.20.0（Vite 7 + react-router）
> 两边无共同祖先，**不能 git merge / rebase / cherry-pick**，只能按功能人工移植。
> 官方 v0.9.0 → v0.20.0（含 Unreleased）共 **170 条**更新。

## 已同步

| # | 官方条目 | 版本 | 本地落点 |
|---|---|---|---|
| 1 | 画布底部工具栏新增「居中聚焦」按钮 | Unreleased | `canvas-toolbar.tsx`，复用已有 `focusNode` 动画聚焦 |
| 2 | 设置新增「选中自动居中」，默认关闭 | Unreleased | 画布外观面板开关 + `AiConfig.autoFocusOnSelect` |
| 3 | 修复画布尺寸测量未生效导致聚焦/重置/中心缩放定位偏移 | Unreleased | 测量 effect 改为依赖 `projectLoaded` |

## 不可移植（依赖官方独有架构，做了也没意义）

| 类别 | 条目数（约） | 原因 |
|---|---|---|
| Canvas Agent / Codex / MCP | 约 40 | 官方用 Node 版 canvas-agent + Codex CLI + MCP；本地是 Go 后端 + 自研 Agent，两套运行时 |
| 本地代理 `@basketikun/canvas-proxy` | 2 | 官方是纯前端直连需要浏览器侧转发；本地已有 Go 后端，能直接转发 |
| ZCode 插件 | 1 | 同上，依赖官方 Agent 运行时 |
| 插件系统 / Codex App 插件 | 3 | 依赖官方插件注册与 SDK |
| 文档站（docs site）相关 | 3 | 官方文档站独立工程，本地无对应物 |
| 提示词来源（Freestylefly / BananaPromptQuicker / 统一 JSON 源） | 5 | 本地提示词库走自建接口，来源模型不同；如需要可另做 |

## 待办批次（按性价比排序）

### 批次 2｜画布交互（纯前端，冲突最小）
- [ ] 画布元素列表新增缩略图视图，可切换并记住选择；悬停图片/视频在画布上预览原图
- [ ] 画布连线按视口裁剪渲染（节点与连线多时缩放平移更流畅）
- [ ] 画布拖拽节点时，组投放检测与位置更新合并到同一帧计算
- [ ] 图片和文本上层操作按钮改为鼠标移入后才显示，不再遮挡画面
- [ ] 复制粘贴节点带上参考连线（本地已复制普通连线，需确认参考连线）
- [ ] 修复「选择参考」提示按钮位置错误、参考模式下悬浮工具条遮挡选择区域

### 批次 3｜生成参数
- [ ] 图像质量改为自动 + 5 档（低/中/高/极高/最高），质量只作为 quality 参数，尺寸不再随质量变化
- [ ] 默认生图分辨率 / 默认视频分辨率（设置·生成偏好，作为新建节点与工作台默认值）
- [ ] 生图调用脚本新增 resolution 参数（1k/2k/4k/auto），Gemini 模板用它发 imageConfig.imageSize
- [ ] Gemini 图片请求不再按模型名判断是否支持分辨率
- [ ] WebP 缩略图渲染（画布图片、元素列表、参考栏、资产卡片、生图历史）—— 本地已有 WebP，需核对覆盖面

### 批次 4｜节点与引用
- [ ] 节点输入框上方参考内容栏（预览/移除/连续选择参考节点，组引用展开全部内容）
- [ ] 组节点作为生成输入，单条连线或 `@` 引用组内全部资源
- [ ] 画布左侧元素列表按组展示树形层级，组内节点可展开收起
- [ ] 视频节点右键截取首帧/尾帧/当前帧（本地已有 `captureVideoNodeFrame`，核对是否三帧齐全）

### 批次 5｜可选（本地目前完全缺失）
- [ ] 中英文国际化框架（官方 v0.14 起全量 i18n；本地全是硬编码中文）
- [ ] Google Analytics 4 / 百度统计（运行时配置）
- [ ] 本地存储统计与站点配额展示

## 工程约定

- 每批改动前先 `git fetch origin` 确认基座没动；改完跑 `tsc --noEmit`，**错误数必须仍是 9**（上游自带 9 个 `string | undefined` 旧账，非本次引入）。
- 每批单独 commit，中文 CHANGELOG 记在 `## Unreleased` 下，用「新增 / 修复 / 优化 / 调整」标签。
- 推送走 `myfork`（GFG374/infinite-canvas），不碰 `origin`（只读）与 `upstream`（参考）。
