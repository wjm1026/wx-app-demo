export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data?: T
}

export interface PagedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface UserInfo {
  _id: string
  nickname: string
  avatar: string
  points: number
  free_views: number
  invite_code: string
  inviter_id?: string
  invite_count: number
  is_vip: boolean
  role?: 'user' | 'admin'
  status?: number
  create_time?: number
}

export interface Category {
  _id: string
  name: string
  icon?: string
  cover?: string
  color?: string
  card_count?: number
  gradient?: string
  description?: string
  sort?: number
  sort_order?: number
  status?: number
  create_time?: number
  update_time?: number
}

export interface Card {
  _id: string
  name: string
  name_en?: string
  name_pinyin?: string
  category_id: string
  image: string
  images?: string[]
  audio?: string
  audio_en?: string
  sound?: string
  video?: string
  description?: string
  fun_fact?: string
  tags?: string[]
  is_free: boolean
  points_cost: number
  view_count: number
  favorite_count: number
  is_hot: boolean
  category?: Category
  isFavorited?: boolean
  favorite_id?: string
  favorited_at?: number
  create_time?: number
  update_time?: number
  status?: number
}

export interface CardLite {
  _id: string
  category_id: string
  name: string
  image: string
  update_time?: number
}

export interface PointsLogItem {
  _id: string
  type: string
  amount: number
  balance?: number
  description?: string
  reason?: string
  related_id?: string
  create_time: number
}

export interface LoginByWeixinResult {
  token: string
  tokenExpired?: number
  userInfo: UserInfo
  isNewUser?: boolean
}

export interface InviteUserInfo {
  _id?: string
  nickname?: string
  avatar?: string
  create_time?: number | string
  created_at?: number | string
  time?: number | string
}

export type InviteTaskKey =
  | 'share-friend'
  | 'moments'
  | 'douyin'
  | 'xiaohongshu'

export interface InviteTaskConfig {
  key: InviteTaskKey
  channel: string
  title: string
  desc: string
  note: string
  points: number
  actionLabel: string
  enabled: boolean
  sortOrder: number
}

export interface InviteInfoResult {
  invite_code?: string
  inviteCode?: string
  inviteCount?: number
  inviterId?: string
  canBindInviteCode?: boolean
  inviteBindDeadline?: number
  list?: InviteUserInfo[]
  invitedList?: InviteUserInfo[]
  invitedUsers?: InviteUserInfo[]
  invited_users?: InviteUserInfo[]
}

export interface BindInviteCodeResult {
  userInfo: UserInfo
  inviterId: string
  inviteReward: number
}

export interface SaveInviteTaskConfigsResult {
  tasks: InviteTaskConfig[]
}

export interface AdminCheckResult {
  isAdmin: boolean
  nickname: string
  avatar: string
}

export interface AdminStatsPointStat {
  _id: string
  total: number
  count: number
}

export interface AdminStatsResult {
  userCount: number
  cardCount: number
  categoryCount: number
  todayNewUsers: number
  todayActiveUsers: number
  todayPointsStats?: AdminStatsPointStat[]
}

export interface AdminLearningLogResetResult {
  removedLearningLogCount: number
  resetUserCount: number
  achievementsUntouched: boolean
}

export interface AdminAliyunCredentials {
  appKey?: string
  accessKeyId?: string
  accessKeySecret?: string
  nlsToken?: string
}

export interface AdminCardBatchRequest {
  overwrite?: boolean
  limit?: number
  startId?: number
  onlyEnabled?: boolean
  credentials?: AdminAliyunCredentials
}

export interface AdminCardBatchResult {
  scanned?: number
  generated?: number
  translated?: number
  skipped?: number
  failed?: number
  elapsedMs?: number
  limit?: number
  overwrite?: boolean
  onlyEnabled?: boolean
  startId?: string
  autoTranslate?: boolean
  bucket?: string
  prefix?: string
}

export interface AdminUserListItem {
  _id: string
  nickname?: string
  avatar?: string
  points?: number
  invite_count?: number
  status?: number
  role?: 'user' | 'admin'
  create_time?: number | string
}

export interface AdminUserDetailResult {
  user: UserInfo
  favoriteCount: number
  invitedCount: number
  recentPoints: PointsLogItem[]
}

export interface AdminCardListQuery {
  page?: number
  pageSize?: number
  categoryId?: string
  keyword?: string
  status?: number
}

export interface AdminCardPayload extends Partial<Card> {
  _id?: string
}

export interface AdminCategoryPayload {
  _id?: string
  name?: string
  icon?: string
  cover?: string
  color?: string
  gradient?: string
  description?: string
  sort?: number
  sort_order?: number
  status?: number
}

export interface Achievement {
  id: string
  name: string
  icon: string
  description: string
  points: number
  unlocked: boolean
  unlockTime?: number
}

export interface LearningProgress {
  cardsLearned: number
  totalCards: number
  progress: number
  signStreak: number
  categoryProgress: Array<{
    categoryId: string
    name: string
    icon: string
    total: number
    learned: number
    progress: number
    isComplete: boolean
  }>
}

export interface AchievementsResult {
  achievements: Achievement[]
  unlockedCount: number
  totalCount: number
}
