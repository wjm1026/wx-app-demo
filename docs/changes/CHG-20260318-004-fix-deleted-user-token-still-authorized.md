---
id: 'CHG-20260318-004'
title: '删除用户后登录态仍可访问受保护接口'
type: 'fix'
level: 'risky'
status: implemented
review_required: true
created_at: '2026-03-18'
related_issue: 'N/A'
---

# 背景
当前自定义鉴权只校验 token 的签名和过期时间，不会在鉴权阶段确认 token 内的 `uid` 是否仍然对应 `users` 集合中的有效用户。  
这会导致用户记录已经从数据库删除后，只要本地还保留旧 token，部分受保护云对象仍会继续执行业务逻辑，形成明显的身份校验漏洞。  
用户已经明确要求把“uid 对应用户仍存在”收敛为受保护接口的统一前置条件，而不是依赖个别接口各自判空。

# 目标
- 在公共鉴权层增加“uid 对应用户存在”校验，删除用户后旧 token 不再被当作有效登录态。
- 把所有受保护云对象统一切到新的用户存在校验，避免再出现接口遗漏。
- 前端收到“用户已不存在 / 登录态失效”后及时退出登录，避免继续展示本地缓存用户信息。

# 非目标
- 不调整现有 token 结构、签名算法、过期时间或管理员权限规则。
- 不修改数据库 schema，不新增风控字段或封禁态逻辑。
- 不改动公开可匿名访问的业务路径，只要求“带 token 的受保护能力必须绑定到真实存在的用户”。

# 流程 / 行为摘要
- 所有需要登录的云对象在通过 token 验签后，会再查询一次 `users` 集合确认 `uid` 仍存在。
- 若用户记录不存在，则受保护接口直接返回未登录/登录态失效，不再继续执行后续业务。
- 对于允许匿名访问但会读取登录态的接口，会在用户记录不存在时回退为匿名态，而不是把已删除用户继续当作已登录用户处理。
- 前端收到这类返回后会清理本地登录态，避免页面继续展示已删除用户的缓存信息。

# 文件计划
| 状态 | 层级 | 文件 | 计划变更 |
| --- | --- | --- | --- |
| confirmed | shared | `uniCloud-aliyun/cloudfunctions/common/custom-auth/index.js` | 在公共鉴权模块新增“验证 token 后确认 users 中 uid 仍存在”的异步能力。 |
| confirmed | service | `uniCloud-aliyun/cloudfunctions/user-center/index.obj.js` | 所有需要登录的用户中心接口改用新的用户存在校验。 |
| confirmed | service | `uniCloud-aliyun/cloudfunctions/points-service/index.obj.js` | 积分相关受保护接口统一使用新的鉴权上下文，防止删除用户后继续发分或扣分。 |
| confirmed | service | `uniCloud-aliyun/cloudfunctions/achievement-service/index.obj.js` | 学习记录与成就接口补齐用户存在校验。 |
| confirmed | service | `uniCloud-aliyun/cloudfunctions/card-service/index.obj.js` | 收藏等受保护能力增加用户存在校验；允许匿名的详情接口在用户不存在时退回匿名态。 |
| confirmed | service | `uniCloud-aliyun/cloudfunctions/admin-service/index.obj.js` | 管理员鉴权复用新的用户存在校验，避免已删除管理员 token 继续生效。 |
| confirmed | hook | `src/pages/user/hooks/useUserPage.ts` | 把“用户不存在 / 登录态失效”一并按掉线处理，清理本地登录态。 |
| suspected | test | `src/**/*.spec.ts` | 若仓库存在鉴权或用户中心测试，需要补上“删除用户后失效”的覆盖；当前未发现测试文件。 |

# 实现说明
- Approach: 在 `custom-auth` 中新增异步用户鉴权上下文，先复用现有 token 验签，再统一查询 `users` 集合确认 `uid` 存在；各云对象改为 `await` 新上下文，必要时直接复用返回的 `user`，前端把该类返回按掉线处理。
- Constraints: 不能破坏现有登录接口的 token 发放逻辑；匿名接口仍需允许无 token 访问；手动分散在各个云对象里的校验要尽量收敛，避免未来继续漏接口。
- Reuse: 继续复用现有 `getAuthContext` 的 token 解析与签名校验逻辑，只在其上补一层用户存在验证。

# 验证计划（固定三项）
| 项目 | 命令 | 预期结果 |
| --- | --- | --- |
| eslint | `npm run lint` | pass |
| ts/typecheck | `npm run type-check` | pass |
| unit test | `npm run test:unit` | pass |

# 风险 / 回滚
- Risk: 公共鉴权从同步扩展到异步后，若某些云对象漏改 `await`，会直接导致接口异常；另外匿名接口若处理不对，可能把原本可匿名访问的场景一并锁死。
- Rollback: 回退 `custom-auth` 与各云对象对新鉴权上下文的接入，并恢复前端原有未登录处理逻辑。

# 未决问题 / 假设
- 假设“用户记录已删除”应统一视为登录态失效，而不是对外暴露独立的 404 业务分支。
- 假设前端只要收到这类失效返回，就应该直接退出登录并丢弃本地缓存用户信息。

# 执行确认
- [ ] 若 level=lite：用户已明确确认，可开始实现
- [ ] 若 level=risky：人工评审已通过
- [x] 若 level=risky：用户已明确确认，可开始实现

# 实施结果
- 已在公共鉴权层新增用户存在校验，旧 token 在用户记录被删除后不再被当作有效登录态。
- 已将用户中心、积分、成就、收藏、管理员等受保护云对象统一切换到新的鉴权上下文。
- 已让允许匿名访问的卡片详情接口在“token 对应用户不存在”时回退为匿名态，而不是继续视为已登录。
- 已让前端把“用户不存在 / 登录态失效”统一按掉线处理并执行本地登出。

# 实际变更文件
| 文件 | 实际变更 |
| --- | --- |
| `uniCloud-aliyun/cloudfunctions/common/custom-auth/index.js` | 新增异步用户鉴权上下文，统一校验 `uid` 对应用户仍存在。 |
| `uniCloud-aliyun/cloudfunctions/user-center/index.obj.js` | 受保护接口改用新的用户鉴权上下文。 |
| `uniCloud-aliyun/cloudfunctions/points-service/index.obj.js` | 受保护积分接口改用新的用户鉴权上下文。 |
| `uniCloud-aliyun/cloudfunctions/achievement-service/index.obj.js` | 成就与学习记录接口改用新的用户鉴权上下文。 |
| `uniCloud-aliyun/cloudfunctions/card-service/index.obj.js` | 收藏等接口改用新的用户鉴权上下文，详情接口对删除用户降级为匿名态。 |
| `uniCloud-aliyun/cloudfunctions/admin-service/index.obj.js` | 管理员鉴权复用新的用户存在校验。 |
| `src/pages/user/hooks/useUserPage.ts` | 将“用户不存在”与 401 一并按登录态失效处理。 |

# 偏离计划说明
- 按计划执行；由于用户已明确要求立即实现，本次先完成本地修复并在文档中补记执行确认。

# 验证结果
- eslint: skip，`package.json` 未定义 `npm run lint`
- ts/typecheck: pass，`npm run type-check`
- unit test: skip，`package.json` 未定义 `npm run test:unit`
