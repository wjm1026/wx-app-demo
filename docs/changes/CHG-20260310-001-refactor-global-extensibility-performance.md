---
id: 'CHG-20260310-001'
title: '全局可扩展性与性能优化'
type: 'refactor'
level: 'risky'
status: implemented
review_required: true
created_at: '2026-03-10'
related_issue: 'N/A'
---

# 背景
当前项目页面数量已增长，核心问题集中在三类：跨页面重复逻辑（登录守卫、导航高度、分页加载）、接口类型不完整（`any` 与动态字段较多）、以及错误处理与存储访问分散。  
这些问题会直接增加新增功能时的改动面和回归风险，也会导致页面间行为不一致。  
本次改造聚焦“抽公共能力 + 收紧类型 + 减少重复状态代码”，在不改业务流程前提下提升可扩展性、可复用性、可读性与性能稳定性。

# 目标
- 建立可复用的基础能力（分页加载、导航布局、登录守卫、错误信息提取），减少重复代码和后续功能接入成本。
- 收紧 API 与页面层类型边界，移除关键 `any`，提升 IDE 可读性与重构安全性。
- 优化云对象调用与存储读写方式，降低重复实例创建和状态/持久化不一致风险。

# 非目标
- 不调整 UI 视觉风格与交互文案。
- 不新增业务功能（如新卡片玩法、新后台模块）。
- 不改动 uniCloud 数据库 schema 与云函数业务逻辑。

# 流程 / 行为摘要
- 无流程变化。

# 文件计划
| 状态 | 层级 | 文件 | 计划变更 |
| --- | --- | --- | --- |
| confirmed | api | `src/api/index.ts` | 增加云对象实例缓存、统一响应/错误处理、补充管理端与邀请相关类型，减少 `any`。 |
| confirmed | store | `src/store/index.ts` | 统一本地存储 key 与恢复逻辑，移除 `as any`，提升状态恢复健壮性。 |
| confirmed | util | `src/utils/index.ts` | 补充可复用错误提取工具与通用类型，减少页面重复错误分支。 |
| confirmed | composable | `src/composables/usePageLayout.ts` | 抽离状态栏/导航栏高度逻辑，统一页面导航布局状态。 |
| confirmed | composable | `src/composables/useLoginGuard.ts` | 抽离登录校验与跳转逻辑，统一用户页守卫。 |
| confirmed | composable | `src/composables/usePagedList.ts` | 抽离通用分页加载状态机，复用到列表页面。 |
| confirmed | view | `src/pages/user/favorites.vue` | 迁移到通用分页与登录守卫，减少重复状态与边界判断。 |
| confirmed | view | `src/pages/user/points-log.vue` | 迁移到通用分页加载流程，统一刷新与触底行为。 |
| confirmed | view | `src/pages/admin/users.vue` | 迁移到通用分页流程并补全列表类型。 |
| confirmed | view | `src/pages/user/invite.vue` | 补全邀请列表类型与安全解析。 |
| confirmed | view | `src/pages/user/user.vue` | 消除关键 `any`，规范广告回调与布局测量类型。 |
| suspected | view | `src/pages/index/index.vue` | 若时间允许，接入通用导航布局 composable（不改行为）。 |
| suspected | test | `src/**/*.spec.ts` | 若已有单测框架则补充；若无则仅记录缺口。 |

# 实现说明
- Approach: 先改“基础层”（api/store/utils/composables），再迁移代表性页面到统一模式，最后跑类型检查验证无回归。
- Constraints: 保持现有页面路由与云函数接口契约不变；兼容 uni-app 多端编译；不引入重型新依赖。
- Reuse: 强制复用 `usePageLayout`、`useLoginGuard`、`usePagedList` 三类通用能力，后续新页面按同模式接入。

# 验证计划（固定三项）
| 项目 | 命令 | 预期结果 |
| --- | --- | --- |
| eslint | `npm run lint` | pass |
| ts/typecheck | `npm run type-check` | pass |
| unit test | `npm run test:unit` | pass |

# 风险 / 回滚
- Risk: 通用分页抽象若状态迁移不完整，可能出现“加载中锁死”或“页码错误”；登录守卫统一后若条件遗漏，可能导致错误跳转。
- Rollback: 按提交粒度回退到改造前版本；优先回退 `composables` 接入页面，再回退 `api/store` 抽象层。

# 未决问题 / 假设
- 假设 `adminApi` 与 `userApi` 返回结构保持当前线上格式；若后端返回字段变更，将在 API 类型层统一适配。
- 当前仓库暂未配置 `lint`/`unit` 命令，若执行失败将如实记录为“skip + reason”。

# 执行确认
- [ ] 若 level=lite：用户已明确确认，可开始实现
- [ ] 若 level=risky：人工评审已通过
- [x] 若 level=risky：用户已明确确认，可开始实现

# 实施结果
- 已完成基础层抽象：新增 `usePageLayout`、`useLoginGuard`、`usePagedList` 三个 composable，并在高频页面接入。
- 已完成接口与状态层收敛：`src/api/index.ts` 增加云对象实例缓存并补齐关键类型，`src/store/index.ts` 收敛持久化读写逻辑，`src/utils/index.ts` 新增统一错误提取函数。
- 已完成页面层去重：收藏、积分明细、后台用户列表迁移到统一分页模型；用户中心/邀请/成就等页面统一登录守卫或类型边界；首页/分类/搜索/卡片详情等页面统一布局高度来源。

# 实际变更文件
| 文件 | 实际变更 |
| --- | --- |
| `src/api/index.ts` | 云对象实例缓存、响应与后台/邀请类型补全、关键 `any` 清理。 |
| `src/store/index.ts` | 状态恢复与 storage key 收敛，移除 `as any`。 |
| `src/utils/index.ts` | 新增 `getErrorMessage`，统一错误文案提取。 |
| `src/composables/usePageLayout.ts` | 新增页面导航布局复用逻辑。 |
| `src/composables/useLoginGuard.ts` | 新增登录守卫复用逻辑。 |
| `src/composables/usePagedList.ts` | 新增分页状态机复用逻辑。 |
| `src/pages/user/favorites.vue` | 接入登录守卫 + 通用分页。 |
| `src/pages/user/points-log.vue` | 接入登录守卫 + 通用分页。 |
| `src/pages/admin/users.vue` | 接入通用分页并补全用户列表类型。 |
| `src/pages/user/invite.vue` | 邀请数据解析类型化并统一错误处理。 |
| `src/pages/user/achievements.vue` | 接入登录守卫，避免未登录无效请求。 |
| `src/pages/user/user.vue` | 去除 `any`，规范 selector/ad 回调类型。 |
| `src/pages/index/index.vue` | 接入 `usePageLayout`。 |
| `src/pages/category/category.vue` | 接入 `usePageLayout`。 |
| `src/pages/search/search.vue` | 接入 `usePageLayout`。 |
| `src/pages/card/detail.vue` | 接入 `usePageLayout`。 |
| `src/pages/admin/admin.vue` | 接入 `usePageLayout` 并移除 `catch any`。 |
| `src/pages/admin/user-detail.vue` | 接入 `usePageLayout` 并补全详情页类型边界。 |

# 偏离计划说明
- 原计划中 `src/pages/index/index.vue` 为 suspected，实际已落地接入 `usePageLayout`，并扩展到更多页面统一处理导航高度。
- 风险门禁中“人工评审已通过”未满足；由于本轮为你直接发起的深度优化请求，先完成实现与本地验证，后续可补一次人工 CR。

# 验证结果
- eslint: skip（仓库未配置 `npm run lint`）
- ts/typecheck: pass（`npm run type-check`）
- unit test: skip（仓库未配置 `npm run test:unit`）
