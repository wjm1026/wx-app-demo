---
id: 'CHG-20260312-001'
title: '前端页面 Hook 化与样式外置重构'
type: 'refactor'
level: 'risky'
status: implemented
review_required: true
created_at: '2026-03-12'
related_issue: 'N/A'
---

# 背景
当前前端页面存在两个结构性问题：一是多数 `.vue` 文件同时承载模板、状态、接口请求、生命周期和交互事件，页面脚本普遍超过 150 行，管理端页面已达到 300-800 行级别；二是仍有多处页面使用内联 `<style>`，样式组织方式不统一。  
这种写法会直接抬高后续迭代成本，导致页面逻辑难以复用、测试切入点不清晰、视觉层与行为层耦合严重。  
本次改造聚焦“页面脚本 Hook 化 + 页面样式文件外置化 + 重复逻辑上提”，在不改变现有业务流程与接口契约的前提下，统一项目的前端代码组织方式。

# 目标
- 将 `src` 下所有 Vue 页面与入口/组件中的页面级脚本拆分为 `use*` 组合式 Hook，`.vue` 文件尽量只保留模板绑定、少量 props/emit 声明和 hook 调用。
- 将当前仍以内联 `<style>` 维护的页面样式全部拆分为独立 `.scss` 文件，并统一为外链引入方式。
- 收敛跨页面重复逻辑，优先复用现有 `usePageLayout`、`useLoginGuard`、`usePagedList`，必要时新增小而明确的共享 composable 或 utils。
- 在不改路由、不改接口返回格式、不改云函数实现的前提下，提高可读性、复用性和后续可维护性。

# 非目标
- 不改动 `uniCloud-aliyun/**` 下的云函数实现、数据库 schema 或服务端返回结构。
- 不进行 UI 视觉重设计，只允许为适配样式拆分做等价选择器调整。
- 不引入新的状态管理库、CSS 框架或大型依赖。
- 不顺带新增业务功能，如海报生成、卡片管理、分类管理等占位功能的正式实现。

# 流程 / 行为摘要
- 无流程变化。

# 文件计划
| 状态 | 层级 | 文件 | 计划变更 |
| --- | --- | --- | --- |
| confirmed | app | `src/App.vue` | 将应用生命周期脚本外提为 `use*` Hook，并把全局基础样式迁移到独立 `scss` 文件。 |
| confirmed | component | `src/components/CustomTabbar/CustomTabbar.vue` | 收敛为展示层；若保留脚本逻辑，则抽到独立 `useCustomTabbar` Hook。 |
| confirmed | composable | `src/composables/usePageLayout.ts` | 统一页面导航高度、测量与安全区相关复用逻辑，避免首页/分类/用户页重复测量代码继续分散。 |
| confirmed | composable | `src/composables/useLoginGuard.ts` | 保持登录守卫为统一入口，页面级 hook 通过该能力接入。 |
| confirmed | composable | `src/composables/usePagedList.ts` | 保持分页列表为统一状态机，用户列表、收藏、积分明细等页面级 hook 复用该能力。 |
| confirmed | util | `src/utils/index.ts` | 收敛重复的日期格式化、错误提取、导航/反馈包装与节点测量辅助函数的可复用部分。 |
| confirmed | view | `src/pages/index/index.vue` | 精简为模板层；新增同目录页面 hook 承担首页数据、导航测量、推荐卡片计算等逻辑。 |
| confirmed | view | `src/pages/search/search.vue` | 精简为模板层；新增同目录页面 hook 承担搜索历史、建议词、搜索请求与元数据装配逻辑。 |
| confirmed | view | `src/pages/category/category.vue` | 精简为模板层；新增同目录页面 hook 承担分类展开、分页卡片加载、滚动区测量逻辑。 |
| confirmed | view | `src/pages/card/detail.vue` | 精简为模板层；新增同目录页面 hook 承担详情加载、收藏、音频播放、相关推荐与学习记录逻辑。 |
| confirmed | view | `src/pages/user/user.vue` | 精简为模板层；新增同目录页面 hook 承担登录、签到、资料获取、头部测量与菜单行为逻辑。 |
| confirmed | view | `src/pages/user/favorites.vue` | 精简为模板层；新增同目录页面 hook，并将当前内联样式拆为独立 `favorites.scss`。 |
| confirmed | view | `src/pages/user/points-log.vue` | 精简为模板层；新增同目录页面 hook，并将当前内联样式拆为独立 `points-log.scss`。 |
| confirmed | view | `src/pages/user/invite.vue` | 精简为模板层；新增同目录页面 hook，并将当前内联样式拆为独立 `invite.scss`。 |
| confirmed | view | `src/pages/user/achievements.vue` | 精简为模板层；新增同目录页面 hook，并将当前内联样式拆为独立 `achievements.scss`。 |
| confirmed | view | `src/pages/admin/admin.vue` | 精简为模板层；新增同目录页面 hook，并将当前内联样式拆为独立 `admin.scss`。 |
| confirmed | view | `src/pages/admin/users.vue` | 精简为模板层；新增同目录页面 hook，并将当前内联样式拆为独立 `users.scss`。 |
| confirmed | view | `src/pages/admin/stats.vue` | 精简为模板层；新增同目录页面 hook，并将当前内联样式拆为独立 `stats.scss`。 |
| confirmed | view | `src/pages/admin/user-detail.vue` | 精简为模板层；新增同目录页面 hook，并将当前内联样式拆为独立 `user-detail.scss`。 |
| suspected | test | `src/**/*.spec.ts` | 若仓库补齐单测入口，则为共享 composable 或高风险页面 hook 增加基础行为覆盖；若无测试设施则仅记录缺口。 |

# 实现说明
- Approach: 先统一结构约定，再分两层实施。第一层处理共享能力与入口层，补齐通用测量/格式化/分页/守卫能力；第二层逐页把脚本迁移到同目录 `use*` Hook，并把内联 `<style>` 改为独立 `scss` 文件，通过 `style src` 或等价方式引入。
- Constraints: 仅处理 `src/**` 前端代码；保持现有页面路径、模板行为、云对象调用方式和接口字段兼容；继续使用 Vue 3 Composition API + `<script setup>` + TypeScript，不回退到 Options API。
- Reuse: 强制复用 `usePageLayout`、`useLoginGuard`、`usePagedList`；当节点测量、时间格式化、搜索历史、音频控制等逻辑在 2 个及以上页面重复时，再上提到共享 composable 或 util，避免过度抽象。

# 验证计划（固定三项）
| 项目 | 命令 | 预期结果 |
| --- | --- | --- |
| eslint | `npm run lint` | pass |
| ts/typecheck | `npm run type-check` | pass |
| unit test | `npm run test:unit` | pass |

# 风险 / 回滚
- Risk: 页面生命周期迁移后，可能出现 `onShow` / `onLoad` 触发顺序变化、分页列表刷新时机异常、节点测量高度失真、音频/弹窗事件上下文丢失，且样式外置后可能出现局部选择器失效或作用域变化导致的 UI 偏差。
- Rollback: 按页面或功能域分批回退。优先回退对应页面的 `use*` Hook 接入与样式文件拆分；若共享 composable 抽象导致连锁问题，则回退共享层并恢复原页面脚本实现。

# 未决问题 / 假设
- 假设本轮“整个项目”范围仅指前端 `src/**`，不包含 `uniCloud-aliyun/**` 服务端代码。
- 假设现有外链样式文件 `index.scss`、`search.scss`、`category.scss`、`detail.scss`、`user.scss` 继续保留并按新结构做少量适配，而不是整体重写视觉层。
- 当前仓库未在 `package.json` 中声明 `lint` 与 `test:unit` 命令；若后续验证时命令不存在，将按 `skip + reason` 记录，不临时引入新工具链。

# 执行确认
- [ ] 若 level=lite：用户已明确确认，可开始实现
- [ ] 若 level=risky：人工评审已通过
- [x] 若 level=risky：用户已明确确认，可开始实现

# 实施结果
- 已完成前端 `src/**` 层的页面 Hook 化改造：所有页面/入口/Tabbar 组件的主要脚本逻辑均已迁移到 `use*` 文件，`.vue` 文件当前仅保留模板相关组件导入与 hook 调用。
- 已完成内联样式外置：原先仍写在 `.vue` 文件中的用户子页、管理页与应用级样式已拆分为独立 `.scss` 文件并通过 `style src` 引入。
- 已完成共享能力抽取：新增应用生命周期 hook、节点高度测量 hook，并在 `utils` 中补充默认头像、日期格式化、节点 rect 解析与安全区读取等通用能力。

# 实际变更文件
| 文件 | 实际变更 |
| --- | --- |
| `src/App.vue` | 应用入口改为仅调用 `useAppLifecycle`。 |
| `src/App.scss` | 新增全局基础样式文件，承接原 `App.vue` 内联样式。 |
| `src/utils/index.ts` | 新增 `DEFAULT_AVATAR`、日期格式化、节点 rect 解析与安全区工具。 |
| `src/composables/useAppLifecycle.ts` | 新增应用生命周期封装。 |
| `src/composables/useMeasuredHeight.ts` | 新增页面节点高度测量封装。 |
| `src/components/CustomTabbar/CustomTabbar.vue` | 简化为 hook 调用。 |
| `src/components/CustomTabbar/useCustomTabbar.ts` | 新增 Tabbar 行为 hook。 |
| `src/pages/index/index.vue` | 页面脚本切换为 `useIndexPage`。 |
| `src/pages/index/useIndexPage.ts` | 新增首页数据与导航测量 hook。 |
| `src/pages/search/search.vue` | 页面脚本切换为 `useSearchPage`。 |
| `src/pages/search/useSearchPage.ts` | 新增搜索历史、建议词与搜索行为 hook。 |
| `src/pages/category/category.vue` | 页面脚本切换为 `useCategoryPage`。 |
| `src/pages/category/useCategoryPage.ts` | 新增分类展开、分页与滚动测量 hook。 |
| `src/pages/card/detail.vue` | 页面脚本切换为 `useCardDetailPage`。 |
| `src/pages/card/useCardDetailPage.ts` | 新增详情加载、收藏、音频与相关推荐 hook。 |
| `src/pages/user/user.vue` | 页面脚本切换为 `useUserPage`。 |
| `src/pages/user/useUserPage.ts` | 新增用户中心登录、签到、广告奖励与导航 hook。 |
| `src/pages/user/favorites.vue` | 页面脚本改为 `useFavoritesPage`，样式外链化。 |
| `src/pages/user/useFavoritesPage.ts` | 新增收藏列表 hook。 |
| `src/pages/user/favorites.scss` | 新增收藏页样式文件。 |
| `src/pages/user/points-log.vue` | 页面脚本改为 `usePointsLogPage`，样式外链化。 |
| `src/pages/user/usePointsLogPage.ts` | 新增积分记录列表 hook。 |
| `src/pages/user/points-log.scss` | 新增积分记录页样式文件。 |
| `src/pages/user/invite.vue` | 页面脚本改为 `useInvitePage`，样式外链化。 |
| `src/pages/user/useInvitePage.ts` | 新增邀请信息与复制行为 hook。 |
| `src/pages/user/invite.scss` | 新增邀请页样式文件。 |
| `src/pages/user/achievements.vue` | 页面脚本改为 `useAchievementsPage`，样式外链化。 |
| `src/pages/user/useAchievementsPage.ts` | 新增成就与学习进度 hook。 |
| `src/pages/user/achievements.scss` | 新增成就页样式文件。 |
| `src/pages/admin/admin.vue` | 页面脚本改为 `useAdminPage`，样式外链化。 |
| `src/pages/admin/useAdminPage.ts` | 新增后台首页权限与统计 hook。 |
| `src/pages/admin/admin.scss` | 新增后台首页样式文件。 |
| `src/pages/admin/users.vue` | 页面脚本改为 `useAdminUsersPage`，样式外链化。 |
| `src/pages/admin/useAdminUsersPage.ts` | 新增用户列表筛选与分页 hook。 |
| `src/pages/admin/users.scss` | 新增用户管理页样式文件。 |
| `src/pages/admin/stats.vue` | 页面脚本改为 `useAdminStatsPage`，样式外链化。 |
| `src/pages/admin/useAdminStatsPage.ts` | 新增数据统计页 hook。 |
| `src/pages/admin/stats.scss` | 新增数据统计页样式文件。 |
| `src/pages/admin/user-detail.vue` | 页面脚本改为 `useAdminUserDetailPage`，样式外链化。 |
| `src/pages/admin/useAdminUserDetailPage.ts` | 新增用户详情管理操作 hook。 |
| `src/pages/admin/user-detail.scss` | 新增用户详情页样式文件。 |

# 偏离计划说明
- 原计划中提到“若保留 `CustomTabbar` 逻辑则抽到独立 hook”，实际已落地为 `useCustomTabbar.ts`。
- 风险门禁中的“人工评审已通过”未满足；由于本轮由你直接确认执行，先完成本地重构与类型验证，并在此记录为流程偏离。
- 原计划中的 `src/**/*.spec.ts` 未新增，因为仓库当前没有可执行的单测命令与配套测试基础设施。

# 验证结果
- eslint: skip，`npm run lint` 缺少脚本
- ts/typecheck: pass，`npm run type-check`
- unit test: skip，`npm run test:unit` 缺少脚本
