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
| 4 | 画布元素列表新增缩略图视图，可切换并记住选择 | Unreleased | `canvas-side-panel.tsx` 的 `CanvasNodesTab` + `use-canvas-ui-store.nodeViewMode`（持久化） |
| 5 | 元素列表悬停节点在画布上预览原图/原视频 | Unreleased | `hoverPreviewNodeId` + 遮罩层，`retainedPreviewRef` 保证淡出不留白 |
| 6 | 元素列表图片行新增「预览原图」按钮 | Unreleased | `CanvasNodesTab` 行内 `Eye` 按钮 |
| 7 | 画布连线按视口裁剪渲染 | Unreleased | `visibleConnections` useMemo，复用 `viewBounds` |
| 8 | 拖拽节点时组投放检测与位置更新合并同帧 | Unreleased | 合并进同一 `requestAnimationFrame`，`initialById` Map 替代 `find` |
| 9 | 图片/视频上层操作按钮改为鼠标移入显示 | Unreleased | `canvas-node.tsx` 的 `controlClassName`，`group/node` + 选中保持可见 |
| 10 | 复制粘贴节点带上参考连线 | Unreleased | 过滤条件改为 `toNodeId` 在选区，粘贴时映射 `fromNodeId` |
| 11 | 参考模式下悬浮工具条遮挡选择区域 | Unreleased | `CanvasNodeHoverToolbar` 在 `referencePickerNodeId` 存在时传 `node={null}` |
| 12 | 图像质量改为自动 + 5 档 | Unreleased | `image-settings-panel.tsx` 质量网格 + `QUALITY_BASE` 补 `xhigh/max` |
| 13 | 质量不再参与尺寸换算 | Unreleased | `resolveSize(ratio)` / `resolveRequestSize(size)` 去掉 quality 入参，`RATIO_PRESET_SIZE` 固定像素 |
| 14 | 默认生图 / 默认视频分辨率 | Unreleased | 设置·生成偏好两项 Form.Item；`lib/image-resolution.ts` 提供档位换算 |
| 15 | WebP 缩略图渲染（画布、元素列表、参考栏、资产卡片、生图历史） | v0.13 | 本地 `image-storage.ts` / `image-utils.ts` 已是 WebP，缩略图视图直接复用节点媒体地址 |

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

### 批次 2｜画布交互（纯前端，冲突最小）——已完成
- [x] 画布元素列表新增缩略图视图，可切换并记住选择；悬停图片/视频在画布上预览原图
- [x] 画布连线按视口裁剪渲染（节点与连线多时缩放平移更流畅）
- [x] 画布拖拽节点时，组投放检测与位置更新合并到同一帧计算
- [x] 图片和文本上层操作按钮改为鼠标移入后才显示，不再遮挡画面
- [x] 复制粘贴节点带上参考连线（本地已复制普通连线，需确认参考连线）
- [x] 修复「选择参考」提示按钮位置错误、参考模式下悬浮工具条遮挡选择区域

> 关于最后一条：本地提示按钮本就是顶部居中固定定位（`top-4 left-1/2 -translate-x-1/2 z-[90]`），
> 不存在官方的偏移问题；遮挡问题通过参考选择期间不渲染悬浮工具条解决。

### 批次 3｜生成参数——已完成
- [x] 图像质量改为自动 + 5 档（低/中/高/极高/最高），质量只作为 quality 参数，尺寸不再随质量变化
- [x] 默认生图分辨率 / 默认视频分辨率（设置·生成偏好，作为新建节点与工作台默认值）
- [x] 生图调用脚本新增 resolution 参数（1k/2k/4k/auto），Gemini 模板用它发 imageConfig.imageSize
- [x] Gemini 图片请求不再按模型名判断是否支持分辨率
- [x] WebP 缩略图渲染（画布图片、元素列表、参考栏、资产卡片、生图历史）—— 本地已有 WebP，需核对覆盖面

> 中间两条与本地架构不同，做了等价处理而非照搬：
> - 官方的「生图调用脚本」属于 node 版 canvas-agent，本地是 Go 后端直连渠道，
>   前端已在 `services/api/image.ts` 里按宽高比折算具体像素（`RATIO_PRESET_SIZE`），
>   resolution 档位由 `lib/image-resolution.ts` 在设置面板统一换算，语义已对齐。
> - 「按模型名判断是否支持分辨率」在官方是运时代码分支；本地把能力声明收敛到
>   Go 侧模型能力表（`handler/kie_video.go` 的 `modelSpecs`、`handler/apimart_image.go` 的
>   `apimartImageConfig`），由表配置而非散落的字符串判断，本身就是更好的形态，无需改动。

### 批次 4｜节点与引用——已完成（本地原有，核对通过）
- [x] 节点输入框上方参考内容栏（预览/移除/连续选择参考节点，组引用展开全部内容）
- [x] 组节点作为生成输入，单条连线或 `@` 引用组内全部资源（`getContextResourceNodes` 已展开组成员）
- [x] 画布左侧元素列表按组展示树形层级，组内节点可展开收起（列表视图保留树形，缩略图视图平铺）
- [x] 视频节点右键截取首帧/尾帧/当前帧（`captureVideoNodeFrame` 三帧齐全）

### 批次 5｜可选（本地目前完全缺失，本次未做）
- [ ] 中英文国际化框架（官方 v0.14 起全量 i18n；本地全是硬编码中文）
- [ ] Google Analytics 4 / 百度统计（运行时配置）
- [ ] 本地存储统计与站点配额展示

> 批次 1 至 4 已全部落地，剩余可移植项只剩批次 5 这三条。
> 它们不影响功能可用性，属于产品化增强，需要时再单独排期。

## 结论

官方 v0.9 → v0.20 的更新里，**能落到本地的已经全部落完**：

- 纯前端交互（缩略图视图、悬停预览、视口裁剪、同帧拖拽、悬停显按钮、粘贴带参考连线）—— 已移植
- 生成参数（质量 5 档、尺寸与质量解耦、默认分辨率）—— 已移植
- 节点与引用（参考栏、组展开、树形层级、三帧截取）—— 本地原本就有，核对一致
- Agent / Codex / MCP / 插件 / 文档站 / 代理 / 提示词来源 —— 架构不同，不可移植
- i18n / 统计 / 存储配额 —— 可做但非本次范围

## 工程约定

- 每批改动前先 `git fetch origin` 确认基座没动；改完跑 `tsc --noEmit`，**错误数必须仍是 9**（上游自带 9 个 `string | undefined` 旧账，非本次引入）。
- 每批单独 commit，中文 CHANGELOG 记在 `## Unreleased` 下，用「新增 / 修复 / 优化 / 调整」标签。
- 推送走 `myfork`（GFG374/infinite-canvas），不碰 `origin`（只读）与 `upstream`（参考）。
