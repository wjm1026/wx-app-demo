import { apiDelete, apiGet, apiPost, apiPut } from './shared'
import type {
  AdminCardPayload,
  AdminCardSortPayload,
  AdminCardListQuery,
  AdminCardBatchRequest,
  AdminGamePromptAudioRequest,
  AdminCardBatchResult,
  AdminCategoryPayload,
  AdminDisplayConfigPayload,
  AdminPointsRuleConfigPayload,
  AdminCheckResult,
  DisplayConfigResult,
  InviteTaskConfig,
  AdminLearningLogResetResult,
  AdminStatsResult,
  AdminUserDetailResult,
  AdminUserListItem,
  ApiResponse,
  Card,
  Category,
  PagedResult,
  PointsRuleConfig,
  SaveInviteTaskConfigsResult,
} from './types'

export const adminApi = {
  /** 检查后台 */
  checkAdmin: () => apiGet<AdminCheckResult>('/api/v1/admin/check') as Promise<ApiResponse<AdminCheckResult>>,
  /** 获取统计数据 */
  getStats: () => apiGet<AdminStatsResult>('/api/v1/admin/stats') as Promise<ApiResponse<AdminStatsResult>>,
  /** 获取邀请任务配置 */
  getInviteTaskConfigs: () =>
    apiGet<InviteTaskConfig[]>('/api/v1/admin/invite-task-configs') as Promise<ApiResponse<InviteTaskConfig[]>>,
  /** 获取首页 Logo + 游戏配置 */
  getDisplayConfig: () =>
    apiGet<DisplayConfigResult>('/api/v1/admin/display-config') as Promise<ApiResponse<DisplayConfigResult>>,
  /** 获取积分扣费规则 */
  getPointsRules: () =>
    apiGet<PointsRuleConfig>('/api/v1/admin/points-rules') as Promise<ApiResponse<PointsRuleConfig>>,
  /** 保存积分扣费规则 */
  savePointsRules: (payload: AdminPointsRuleConfigPayload) =>
    apiPut<PointsRuleConfig>('/api/v1/admin/points-rules', payload) as Promise<ApiResponse<PointsRuleConfig>>,
  /** 保存首页 Logo + 游戏配置 */
  saveDisplayConfig: (payload: AdminDisplayConfigPayload) =>
    apiPut<DisplayConfigResult>(
      '/api/v1/admin/display-config',
      payload,
    ) as Promise<ApiResponse<DisplayConfigResult>>,
  /** 保存邀请任务配置 */
  saveInviteTaskConfigs: (configs: InviteTaskConfig[]) =>
    apiPut<SaveInviteTaskConfigsResult>(
      '/api/v1/admin/invite-task-configs',
      { configs },
    ) as Promise<ApiResponse<SaveInviteTaskConfigsResult>>,
  /** 获取用户列表 */
  getUserList: (params?: { page?: number; pageSize?: number; status?: number; keyword?: string }) =>
    apiGet<PagedResult<AdminUserListItem>>('/api/v1/admin/users', params) as Promise<
      ApiResponse<PagedResult<AdminUserListItem>>
    >,
  /** 获取用户详情 */
  getUserDetail: (userId: string) =>
    apiGet<AdminUserDetailResult>(
      `/api/v1/admin/users/${encodeURIComponent(userId)}`,
    ) as Promise<ApiResponse<AdminUserDetailResult>>,
  /** 更新用户状态 */
  updateUserStatus: (userId: string, status: number) =>
    apiPut(`/api/v1/admin/users/${encodeURIComponent(userId)}/status`, { status }) as Promise<ApiResponse>,
  /** 处理调整用户积分相关逻辑 */
  adjustUserPoints: (userId: string, amount: number, reason?: string) =>
    apiPost(`/api/v1/admin/users/${encodeURIComponent(userId)}/points/adjust`, {
      amount,
      reason,
    }) as Promise<ApiResponse>,
  /** 设置用户角色 */
  setUserRole: (userId: string, role: 'user' | 'admin') =>
    apiPut(`/api/v1/admin/users/${encodeURIComponent(userId)}/role`, { role }) as Promise<ApiResponse>,
  /** 获取卡片列表 */
  getCardList: (params?: AdminCardListQuery) =>
    apiGet<PagedResult<Card>>('/api/v1/admin/cards', params) as Promise<ApiResponse<PagedResult<Card>>>,
  /** 保存卡片 */
  saveCard: (cardData: AdminCardPayload) => {
    const { _id, ...payload } = cardData
    if (_id) {
      return apiPut(`/api/v1/admin/cards/${encodeURIComponent(_id)}`, payload) as Promise<ApiResponse>
    }
    return apiPost('/api/v1/admin/cards', payload) as Promise<ApiResponse>
  },
  /** 批量保存卡片排序 */
  saveCardSortBatch: (items: AdminCardSortPayload[]) =>
    apiPost<{ updatedCount: number }>('/api/v1/admin/cards/sort/batch', { items }) as Promise<
      ApiResponse<{ updatedCount: number }>
    >,
  /** 删除卡片 */
  deleteCard: (cardId: string) =>
    apiDelete(`/api/v1/admin/cards/${encodeURIComponent(cardId)}`) as Promise<ApiResponse>,
  /** 批量中文转英文 */
  translateCardZhToEn: (payload?: AdminCardBatchRequest) =>
    apiPost<AdminCardBatchResult>(
      '/api/v1/admin/cards/translate-zh-to-en',
      payload,
    ) as Promise<ApiResponse<AdminCardBatchResult>>,
  /** 批量生成中文语音 */
  generateCardCnAudio: (payload?: AdminCardBatchRequest) =>
    apiPost<AdminCardBatchResult>(
      '/api/v1/admin/cards/audio/generate-cn',
      payload,
    ) as Promise<ApiResponse<AdminCardBatchResult>>,
  /** 批量生成英文语音（默认不自动翻译） */
  generateCardEnAudio: (payload?: AdminCardBatchRequest & { autoTranslate?: boolean }) =>
    apiPost<AdminCardBatchResult>(
      '/api/v1/admin/cards/audio/generate-en',
      payload,
    ) as Promise<ApiResponse<AdminCardBatchResult>>,
  /** 批量生成游戏题干语音（支持按分类） */
  generateGamePromptAudio: (payload?: AdminGamePromptAudioRequest) =>
    apiPost<AdminCardBatchResult>(
      '/api/v1/admin/games/audio/generate-animal-prompts',
      payload,
    ) as Promise<ApiResponse<AdminCardBatchResult>>,
  /** 获取分类列表 */
  getCategoryList: () => apiGet<Category[]>('/api/v1/admin/categories') as Promise<ApiResponse<Category[]>>,
  /** 保存分类 */
  saveCategory: (categoryData: AdminCategoryPayload) => {
    const { _id, ...payload } = categoryData
    if (_id) {
      return apiPut(`/api/v1/admin/categories/${encodeURIComponent(_id)}`, payload) as Promise<ApiResponse>
    }
    return apiPost('/api/v1/admin/categories', payload) as Promise<ApiResponse>
  },
  /** 删除分类 */
  deleteCategory: (categoryId: string) =>
    apiDelete(`/api/v1/admin/categories/${encodeURIComponent(categoryId)}`) as Promise<ApiResponse>,
  /** 清空学习日志 */
  clearLearningLog: () =>
    apiPost<AdminLearningLogResetResult>('/api/v1/admin/maintenance/learning-log/reset', {
      confirmText: 'RESET_LEARNING_LOG',
    }) as Promise<ApiResponse<AdminLearningLogResetResult>>,
}
