---
id: 'CHG-20260317-001'
title: 'Refactor auth and page hook maintainability hotspots'
type: 'refactor'
level: 'lite'
status: implemented
review_required: false
created_at: '2026-03-17'
related_issue: 'N/A'
---

# 背景
当前前端页面 hook 已完成第一轮拆分，但局部文件仍然保留了明显的“大函数 + 多职责堆叠”问题。`src/pages/user/useUserPage.ts` 同时承载登录、资料刷新、签到、广告奖励、客服跳转和页面导航；`src/pages/admin/useAdminPage.ts` 则存在重复的“确认弹窗 + loading + 请求 + 结果反馈”流程。  
这种结构虽然能运行，但后续改登录文案、广告奖励、后台初始化动作时，维护者需要在单个文件里来回跳读，容易引入重复和行为不一致。  
本次仅做前端局部可维护性重构，不改接口契约、不改页面路由、不改视觉表现。

# 目标
- 将用户页 hook 中的登录态刷新、奖励行为、受登录保护的导航行为拆成更清晰的小函数或小模块，降低单函数认知负担。
- 将管理页中重复的确认执行流程提取为统一 helper，减少重复弹窗/加载/成功失败提示代码。
- 保持现有页面行为、接口调用方式和文案基本兼容，不引入新的业务逻辑。

# 非目标
- 不改动 `uniCloud-aliyun/**` 下的云函数实现与接口返回结构。
- 不重做用户页和管理页 UI，不调整页面层级与路由。
- 不顺带处理全项目所有代码风格问题；本次仅修复当前识别出的高收益维护性热点。

# 流程 / 行为摘要
- 无流程变化。

# 文件计划
| 状态 | 层级 | 文件 | 计划变更 |
| --- | --- | --- | --- |
| confirmed | view | `src/pages/user/useUserPage.ts` | 拆分登录刷新、奖励处理、登录守卫导航与页面生命周期编排，压缩单文件中的混杂职责。 |
| confirmed | view | `src/pages/admin/useAdminPage.ts` | 将重复的确认弹窗+异步执行流改为统一封装，降低重复代码和反馈分叉。 |
| confirmed | composable | `src/composables/useConfirmedAction.ts` | 新增轻量通用 helper，统一“确认 -> loading -> 执行 -> 成功/失败反馈”模式。 |
| suspected | util | `src/utils/index.ts` | 若 `useConfirmedAction` 需要复用现有 loading/toast 封装，则补充或复用现有工具函数。 |

# 实现说明
- Approach: 通过“小而明确”的辅助函数和一个共享 composable 收敛重复流程，不做大范围目录迁移；用户页保留单一入口 `useUserPage`，但内部按职责重组；管理页通过统一 helper 驱动两类确认型后台操作。
- Constraints: 仅修改前端 `src/**`；不更改现有 API 名称、返回字段、页面模板绑定字段和导航路径；继续使用现有 `showToast`、`navigateTo`、`usePageLayout` 等能力。
- Reuse: 必须复用 `src/utils/index.ts` 中现有的 toast / loading / navigation 包装，避免再次复制新的交互工具函数。

# 验证计划（固定三项）
| 项目 | 命令 | 预期结果 |
| --- | --- | --- |
| eslint | `npm run lint` | pass |
| ts/typecheck | `npm run type-check` | pass |
| unit test | `npm run test:unit` | pass |

# 风险 / 回滚
- Risk: 主要风险是用户页登录/签到/广告奖励的提示时机在重构后发生细微变化，或管理页确认型操作的提示文案出现偏差；整体风险低，且不涉及接口和状态格式调整。
- Rollback: 若重构后出现行为偏差，按文件回退 `useUserPage.ts`、`useAdminPage.ts` 和新增的 `useConfirmedAction.ts` 即可恢复原实现。

# 未决问题 / 假设
- 假设本轮“优化一下”优先指向当前最明显的前端长 hook，不扩展到云函数与 store 的进一步抽象。
- 假设仓库当前仍无可执行的 `lint` 和 `test:unit` 脚本；若验证时脚本不存在，将按 `skip + reason` 记录。

# 执行确认
- [x] 若 level=lite：用户已明确确认，可开始实现
- [ ] 若 level=risky：人工评审已通过
- [ ] 若 level=risky：用户已明确确认，可开始实现

# 实施结果
- 已新增统一的确认执行 composable，用于承载“确认弹窗 -> loading -> 执行 -> 成功/失败反馈”的公共流程，避免后台页重复拼装同一套交互。
- 已重构用户页 hook：将未登录处理、登录成功态持久化、登录后资料同步、广告奖励发放与受保护导航分别拆为更小的函数，保留原模板和交互入口不变。
- 已重构管理页 hook：将初始化数据与修复图片两类后台动作统一接入共享 helper，并复用已有导航与反馈工具函数。

# 实际变更文件
| 文件 | 实际变更 |
| --- | --- |
| `src/composables/useConfirmedAction.ts` | 新增确认型异步操作封装，统一确认弹窗、loading 和结果反馈。 |
| `src/pages/admin/useAdminPage.ts` | 抽出后台维护动作公共执行入口，复用 `useConfirmedAction`，移除重复 modal + 请求 + toast 代码。 |
| `src/pages/user/useUserPage.ts` | 重组用户页 hook 内部职责，抽离未登录守卫、登录结果持久化、登录后状态同步、广告奖励与受保护导航封装。 |

# 偏离计划说明
- `src/utils/index.ts` 最终未修改，现有 `showLoading` / `hideLoading` / `showToast` 已足够支撑新 composable。

# 验证结果
- eslint: skip，`npm run lint` 缺少脚本
- ts/typecheck: pass，`npm run type-check`
- unit test: skip，`npm run test:unit` 缺少脚本
