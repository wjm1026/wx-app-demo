---
id: 'CHG-20260318-008'
title: '清理 learning_log 历史数据并补管理员维护入口'
type: 'chore'
level: 'risky'
status: implemented
review_required: true
created_at: '2026-03-18'
related_issue: 'N/A'
---

# 背景
`learning_log` 当前同时存在旧随机 `_id` 记录和新确定性 `_id` 记录，用户已确认历史数据不一致，希望先清空学习记录，再基于新契约重新累积。  
仅删除 `learning_log` 文档本身还不够，因为 `users.cards_learned` 是学习进度链路里的缓存字段；如果不一起归零，页面统计仍会残留旧值。  
本次在已有后端维护方法基础上，再把操作入口直接挂到管理员页面的“维护动作”区域，避免继续依赖 HBuilderX 手工运行云对象。

# 目标
- 提供一个管理员可调用的维护方法，用于清空 `learning_log` 全表数据。
- 在清空学习记录的同时，把 `users.cards_learned` 统一归零，避免清表后用户统计残留旧值。
- 返回清理结果摘要，便于操作者确认实际影响范围。
- 在管理员页面维护动作区提供可直接触发的入口，复用现有确认执行交互流。

# 非目标
- 本次不清空 `user_achievements`、`points_log` 或其他集合。
- 本次不重写成就页统计逻辑和前端页面。
- 本次不引入新的后台页面，仅在现有管理员页面上新增一个维护动作按钮。

# 流程 / 行为摘要
- 无流程变化。

# 文件计划
| 状态 | 层级 | 文件 | 计划变更 |
| --- | --- | --- | --- |
| confirmed | spec | `docs/changes/CHG-20260318-008-chore-清理-learning-log-历史数据并补管理员维护入口.md` | 记录本次历史数据清理范围、维护入口与执行门禁。 |
| confirmed | backend | `uniCloud-aliyun/cloudfunctions/admin-service/index.obj.js` | 新增管理员维护方法，清空 `learning_log` 并重置用户学习计数字段。 |
| confirmed | api | `src/api/admin.ts` | 补充管理员清理 learning_log 的前端 API 封装。 |
| confirmed | type | `src/api/types.ts` | 补充清理 learning_log 返回结果类型。 |
| confirmed | view-model | `src/pages/admin/hooks/useAdminPage.ts` | 在维护动作列表中新增清理 learning_log 的高风险入口，并接入现有确认执行流。 |
| confirmed | ops | `uniCloud-aliyun/cloudfunctions/admin-service/admin-service.param.js` | 保留 HBuilderX “运行云对象”所需的参数示例，作为兜底手工执行方式。 |

# 实现说明
- Approach: 在 `admin-service` 中新增管理员专用维护方法，要求显式确认参数后才执行；先统计 `learning_log` 当前记录数，再执行整表清空，并把 `users.cards_learned > 0` 的用户统一重置为 `0` 和 `update_time=now`。前端管理员页面通过现有 `runConfirmedAction` 承接确认弹窗、loading 和成功提示，并把确认码固定透传给该方法。
- Constraints: 必须保留管理员鉴权；必须要求显式确认参数，避免误触发；不得顺手清空 `user_achievements`。
- Reuse: 复用 `admin-service` 现有 `resolveAdmin` 鉴权模式和 `usersCollection` / `dbCmd.exists(true)` 的批量操作风格。

# 验证计划（固定三项）
| 项目 | 命令 | 预期结果 |
| --- | --- | --- |
| eslint | `npm run lint` | pass |
| ts/typecheck | `npm run type-check` | pass |
| unit test | `npm run test:unit` | pass |

# 风险 / 回滚
- Risk: 这是显式的数据清空操作，执行后无法从代码层恢复；若操作者误以为会连带清空成就表，可能对结果有误判。
- Rollback: 无代码级回滚；只能依赖数据库备份或重新生成学习记录。代码层可回退维护方法本身，但无法恢复已删除数据。

# 未决问题 / 假设
- 假设当前用户明确希望清空的是 `learning_log`，而不是整套成就相关数据。
- 假设清表后把 `users.cards_learned` 清零是合理的最小一致性修复；`user_achievements` 保持不变，后续如需整套重置再单独处理。
- 假设用户接受通过管理员维护入口或 HBuilderX 运行云对象方式执行，而不是要求仓库内自动脚本直接连接线上数据库。

# 执行确认
- [ ] 若 level=lite：用户已明确确认，可开始实现
- [x] 若 level=risky：人工评审已通过
- [x] 若 level=risky：用户已明确确认，可开始实现

# 实施结果
- 已在 `admin-service` 新增 `clearLearningLog` 管理员维护方法，要求同时满足管理员鉴权和 `confirmText=RESET_LEARNING_LOG` 才会执行。
- 该方法会统计当前 `learning_log` 条数、清空全表，并把 `users.cards_learned > 0` 的用户统一重置为 `0`。
- 已新增 `admin-service.param.js` 运行参数示例，方便在 HBuilderX 里直接运行云对象执行清理。
- 已把该维护动作直接接到管理员页面“维护动作”区域，作为可见的高风险维护按钮。

# 实际变更文件
| 文件 | 实际变更 |
| --- | --- |
| `docs/changes/CHG-20260318-008-chore-清理-learning-log-历史数据并补管理员维护入口.md` | 新增并回填本次数据清理维护入口变更单。 |
| `uniCloud-aliyun/cloudfunctions/admin-service/index.obj.js` | 新增 `clearLearningLog` 管理员维护方法。 |
| `src/api/admin.ts` | 新增清理 learning_log 的前端 API 封装。 |
| `src/api/types.ts` | 新增清理 learning_log 返回结果类型。 |
| `src/api/index.ts` | 导出清理 learning_log 返回结果类型。 |
| `src/pages/admin/hooks/useAdminPage.ts` | 新增管理员页面“清空学习记录”维护动作入口。 |
| `uniCloud-aliyun/cloudfunctions/admin-service/admin-service.param.js` | 新增 HBuilderX 运行云对象参数示例。 |

# 偏离计划说明
- 原计划里 `admin-service.param.js` 为 suspected，实际实现时确认该文件能明显降低手工执行成本，因此一并补充。
- 当前会话未直接执行清表动作，因为仓库环境无法直接获取有效管理员 token，也没有可直接连接你 uniCloud 服务空间的本地数据库工具；但现在管理员页面已经提供了可触发入口。

# 验证结果
- eslint: skip，`package.json` 未定义 `npm run lint`
- ts/typecheck: pass，`npm run type-check`
- unit test: skip，`package.json` 未定义 `npm run test:unit`
