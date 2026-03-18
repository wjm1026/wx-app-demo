import { getService } from './shared'
import type {
  ApiResponse,
  BindInviteCodeResult,
  InviteInfoResult,
  InviteTaskConfig,
  LoginByWeixinResult,
  PagedResult,
  PointsLogItem,
  UserInfo,
} from './types'

export const userApi = {
  /** 通过微信登录 */
  loginByWeixin: (code: string, inviteCode?: string) =>
    getService('user-center').loginByWeixin({ code, inviteCode }) as Promise<ApiResponse<LoginByWeixinResult>>,
  /** 绑定邀请码 */
  bindInviteCode: (inviteCode: string) =>
    getService('user-center').bindInviteCode({ inviteCode }) as Promise<ApiResponse<BindInviteCodeResult>>,
  /** 获取用户信息 */
  getUserInfo: () => getService('user-center').getUserInfo() as Promise<ApiResponse<UserInfo>>,
  /** 更新用户信息 */
  updateUserInfo: (params: { nickname?: string; avatar?: string; gender?: number }) =>
    getService('user-center').updateUserInfo(params) as Promise<ApiResponse<UserInfo>>,
  /** 获取邀请任务配置 */
  getInviteTaskConfigs: () =>
    getService('user-center').getInviteTaskConfigs() as Promise<ApiResponse<InviteTaskConfig[]>>,
  /** 获取邀请信息 */
  getInviteInfo: () => getService('user-center').getInviteInfo() as Promise<ApiResponse<InviteInfoResult>>,
  /** 获取积分日志 */
  getPointsLog: (params?: { page?: number; pageSize?: number }) =>
    getService('user-center').getPointsLog(params) as Promise<ApiResponse<PagedResult<PointsLogItem>>>,
}
