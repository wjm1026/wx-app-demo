import { getService } from './shared'
import type {
  AdminCardPayload,
  AdminCategoryPayload,
  AdminCheckResult,
  InviteTaskConfig,
  AdminLearningLogResetResult,
  AdminStatsResult,
  AdminUserDetailResult,
  AdminUserListItem,
  ApiResponse,
  Card,
  Category,
  PagedResult,
  SaveInviteTaskConfigsResult,
} from './types'

export const adminApi = {
  /** 检查后台 */
  checkAdmin: () => getService('admin-service').checkAdmin() as Promise<ApiResponse<AdminCheckResult>>,
  /** 获取统计数据 */
  getStats: () => getService('admin-service').getStats() as Promise<ApiResponse<AdminStatsResult>>,
  /** 获取邀请任务配置 */
  getInviteTaskConfigs: () =>
    getService('admin-service').getInviteTaskConfigs() as Promise<ApiResponse<InviteTaskConfig[]>>,
  /** 保存邀请任务配置 */
  saveInviteTaskConfigs: (configs: InviteTaskConfig[]) =>
    getService('admin-service').saveInviteTaskConfigs({ configs }) as Promise<ApiResponse<SaveInviteTaskConfigsResult>>,
  /** 获取用户列表 */
  getUserList: (params?: { page?: number; pageSize?: number; status?: number; keyword?: string }) =>
    getService('admin-service').getUserList(params) as Promise<ApiResponse<PagedResult<AdminUserListItem>>>,
  /** 获取用户详情 */
  getUserDetail: (userId: string) =>
    getService('admin-service').getUserDetail({ userId }) as Promise<ApiResponse<AdminUserDetailResult>>,
  /** 更新用户状态 */
  updateUserStatus: (userId: string, status: number) =>
    getService('admin-service').updateUserStatus({ userId, status }) as Promise<ApiResponse>,
  /** 处理调整用户积分相关逻辑 */
  adjustUserPoints: (userId: string, amount: number, reason?: string) =>
    getService('admin-service').adjustUserPoints({ userId, amount, reason }) as Promise<ApiResponse>,
  /** 设置用户角色 */
  setUserRole: (userId: string, role: 'user' | 'admin') =>
    getService('admin-service').setUserRole({ userId, role }) as Promise<ApiResponse>,
  /** 获取卡片列表 */
  getCardList: (params?: { page?: number; pageSize?: number; categoryId?: string; keyword?: string }) =>
    getService('admin-service').getCardList(params) as Promise<ApiResponse<PagedResult<Card>>>,
  /** 保存卡片 */
  saveCard: (cardData: AdminCardPayload) =>
    getService('admin-service').saveCard(cardData) as Promise<ApiResponse>,
  /** 删除卡片 */
  deleteCard: (cardId: string) =>
    getService('admin-service').deleteCard({ cardId }) as Promise<ApiResponse>,
  /** 获取分类列表 */
  getCategoryList: () => getService('admin-service').getCategoryList() as Promise<ApiResponse<Category[]>>,
  /** 保存分类 */
  saveCategory: (categoryData: AdminCategoryPayload) =>
    getService('admin-service').saveCategory(categoryData) as Promise<ApiResponse>,
  /** 删除分类 */
  deleteCategory: (categoryId: string) =>
    getService('admin-service').deleteCategory({ categoryId }) as Promise<ApiResponse>,
  /** 清空学习日志 */
  clearLearningLog: () =>
    getService('admin-service').clearLearningLog({
      confirmText: 'RESET_LEARNING_LOG',
    }) as Promise<ApiResponse<AdminLearningLogResetResult>>,
}
