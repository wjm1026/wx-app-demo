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
  checkAdmin: () => getService('admin-service').checkAdmin() as Promise<ApiResponse<AdminCheckResult>>,
  getStats: () => getService('admin-service').getStats() as Promise<ApiResponse<AdminStatsResult>>,
  getInviteTaskConfigs: () =>
    getService('admin-service').getInviteTaskConfigs() as Promise<ApiResponse<InviteTaskConfig[]>>,
  saveInviteTaskConfigs: (configs: InviteTaskConfig[]) =>
    getService('admin-service').saveInviteTaskConfigs({ configs }) as Promise<ApiResponse<SaveInviteTaskConfigsResult>>,
  getUserList: (params?: { page?: number; pageSize?: number; status?: number; keyword?: string }) =>
    getService('admin-service').getUserList(params) as Promise<ApiResponse<PagedResult<AdminUserListItem>>>,
  getUserDetail: (userId: string) =>
    getService('admin-service').getUserDetail({ userId }) as Promise<ApiResponse<AdminUserDetailResult>>,
  updateUserStatus: (userId: string, status: number) =>
    getService('admin-service').updateUserStatus({ userId, status }) as Promise<ApiResponse>,
  adjustUserPoints: (userId: string, amount: number, reason?: string) =>
    getService('admin-service').adjustUserPoints({ userId, amount, reason }) as Promise<ApiResponse>,
  setUserRole: (userId: string, role: 'user' | 'admin') =>
    getService('admin-service').setUserRole({ userId, role }) as Promise<ApiResponse>,
  getCardList: (params?: { page?: number; pageSize?: number; categoryId?: string; keyword?: string }) =>
    getService('admin-service').getCardList(params) as Promise<ApiResponse<PagedResult<Card>>>,
  saveCard: (cardData: AdminCardPayload) =>
    getService('admin-service').saveCard(cardData) as Promise<ApiResponse>,
  deleteCard: (cardId: string) =>
    getService('admin-service').deleteCard({ cardId }) as Promise<ApiResponse>,
  getCategoryList: () => getService('admin-service').getCategoryList() as Promise<ApiResponse<Category[]>>,
  saveCategory: (categoryData: AdminCategoryPayload) =>
    getService('admin-service').saveCategory(categoryData) as Promise<ApiResponse>,
  deleteCategory: (categoryId: string) =>
    getService('admin-service').deleteCategory({ categoryId }) as Promise<ApiResponse>,
  clearLearningLog: () =>
    getService('admin-service').clearLearningLog({
      confirmText: 'RESET_LEARNING_LOG',
    }) as Promise<ApiResponse<AdminLearningLogResetResult>>,
}
