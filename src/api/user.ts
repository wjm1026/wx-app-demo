import { apiGet, apiPost, apiPut } from './shared'
import type {
  ApiResponse,
  BindInviteCodeResult,
  InviteInfoResult,
  InviteTaskConfig,
  LoginByWeixinResult,
  PointsLogPageResult,
  UserInfo,
} from './types'

export const userApi = {
  /** 通过微信登录 */
  loginByWeixin: (code: string, inviteCode?: string) =>
    apiPost<LoginByWeixinResult>(
      '/api/v1/auth/wechat/login',
      { code, inviteCode },
      { withAuth: false },
    ) as Promise<ApiResponse<LoginByWeixinResult>>,
  /** 绑定邀请码 */
  bindInviteCode: (inviteCode: string) =>
    apiPost<BindInviteCodeResult>('/api/v1/users/invite-code/bind', { inviteCode }) as Promise<
      ApiResponse<BindInviteCodeResult>
    >,
  /** 获取用户信息 */
  getUserInfo: () => apiGet<UserInfo>('/api/v1/users/me') as Promise<ApiResponse<UserInfo>>,
  /** 更新用户信息 */
  updateUserInfo: (params: { nickname?: string; avatar?: string; gender?: number }) =>
    apiPut<UserInfo>('/api/v1/users/me', params) as Promise<ApiResponse<UserInfo>>,
  /** 获取邀请任务配置 */
  getInviteTaskConfigs: () =>
    apiGet<InviteTaskConfig[]>(
      '/api/v1/users/invite-task-configs',
      undefined,
      { withAuth: false },
    ) as Promise<ApiResponse<InviteTaskConfig[]>>,
  /** 获取邀请信息 */
  getInviteInfo: () => apiGet<InviteInfoResult>('/api/v1/users/invite-info') as Promise<ApiResponse<InviteInfoResult>>,
  /** 获取积分日志 */
  getPointsLog: (params?: { page?: number; pageSize?: number }) =>
    apiGet<PointsLogPageResult>('/api/v1/users/points-logs', params) as Promise<
      ApiResponse<PointsLogPageResult>
    >,
}
