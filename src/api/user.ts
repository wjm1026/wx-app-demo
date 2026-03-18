import { getService } from './shared'
import type {
  ApiResponse,
  BindInviteCodeResult,
  InviteInfoResult,
  LoginByWeixinResult,
  PagedResult,
  PointsLogItem,
  UserInfo,
} from './types'

export const userApi = {
  loginByWeixin: (code: string, inviteCode?: string) =>
    getService('user-center').loginByWeixin({ code, inviteCode }) as Promise<ApiResponse<LoginByWeixinResult>>,
  bindInviteCode: (inviteCode: string) =>
    getService('user-center').bindInviteCode({ inviteCode }) as Promise<ApiResponse<BindInviteCodeResult>>,
  getUserInfo: () => getService('user-center').getUserInfo() as Promise<ApiResponse<UserInfo>>,
  updateUserInfo: (params: { nickname?: string; avatar?: string; gender?: number }) =>
    getService('user-center').updateUserInfo(params) as Promise<ApiResponse<UserInfo>>,
  getInviteInfo: () => getService('user-center').getInviteInfo() as Promise<ApiResponse<InviteInfoResult>>,
  getPointsLog: (params?: { page?: number; pageSize?: number }) =>
    getService('user-center').getPointsLog(params) as Promise<ApiResponse<PagedResult<PointsLogItem>>>,
}
