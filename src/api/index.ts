// 缓存云对象实例，避免每次调用重复创建代理对象
const serviceCache = new Map<ServiceName, ReturnType<typeof uniCloud.importObject>>()

type ServiceName =
  | 'user-center'
  | 'card-service'
  | 'points-service'
  | 'admin-service'
  | 'achievement-service'

const getService = <T extends ServiceName>(name: T) => {
  const cached = serviceCache.get(name)
  if (cached) {
    return cached
  }

  const service = uniCloud.importObject(name)
  serviceCache.set(name, service)
  return service
}

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
  invite_count: number
  is_vip: boolean
  role?: 'user' | 'admin'
  status?: number
  create_time?: number
}

export interface Category {
  _id: string
  name: string
  icon: string
  cover: string
  card_count?: number
  gradient?: string
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
  create_time?: number
  update_time?: number
  status?: number
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

export interface InviteInfoResult {
  invite_code?: string
  inviteCode?: string
  list?: InviteUserInfo[]
  invitedList?: InviteUserInfo[]
  invitedUsers?: InviteUserInfo[]
  invited_users?: InviteUserInfo[]
}

export const userApi = {
  loginByWeixin: (code: string, inviteCode?: string) =>
    getService('user-center').loginByWeixin({ code, inviteCode }) as Promise<ApiResponse<LoginByWeixinResult>>,
  getUserInfo: () => getService('user-center').getUserInfo() as Promise<ApiResponse<UserInfo>>,
  updateUserInfo: (params: { nickname?: string; avatar?: string; gender?: number }) =>
    getService('user-center').updateUserInfo(params) as Promise<ApiResponse<UserInfo>>,
  getInviteInfo: () => getService('user-center').getInviteInfo() as Promise<ApiResponse<InviteInfoResult>>,
  getPointsLog: (params?: { page?: number; pageSize?: number }) =>
    getService('user-center').getPointsLog(params) as Promise<ApiResponse<PagedResult<PointsLogItem>>>
}

export interface HomeDataResult {
  categories: Category[]
  hotCards: Card[]
  recentCards: Card[]
}

export interface SearchCardsResult extends PagedResult<Card> {
  keyword: string
}

export const cardApi = {
  getCategories: () => getService('card-service').getCategories() as Promise<ApiResponse<Category[]>>,
  getHomeData: () => getService('card-service').getHomeData() as Promise<ApiResponse<HomeDataResult>>,
  getCardsByCategory: (params: { categoryId: string; page?: number; pageSize?: number }) =>
    getService('card-service').getCardsByCategory(params) as Promise<ApiResponse<PagedResult<Card>>>,
  searchCards: (params: { keyword: string; page?: number; pageSize?: number }) =>
    getService('card-service').searchCards(params) as Promise<ApiResponse<SearchCardsResult>>,
  getCardDetail: (cardId: string) =>
    getService('card-service').getCardDetail({ cardId }) as Promise<ApiResponse<Card>>,
  toggleFavorite: (cardId: string) =>
    getService('card-service').toggleFavorite({ cardId }) as Promise<ApiResponse<{ isFavorited: boolean }>>,
  getFavorites: (params?: { page?: number; pageSize?: number }) =>
    getService('card-service').getFavorites(params) as Promise<ApiResponse<PagedResult<Card>>>,
  getRelatedCards: (params: { cardId: string; categoryId: string; limit?: number }) =>
    getService('card-service').getRelatedCards(params) as Promise<ApiResponse<Card[]>>,
  initData: () => getService('card-service').initData() as Promise<ApiResponse>
}

export const pointsApi = {
  earnByAd: (adType: 'banner' | 'video') =>
    getService('points-service').earnByAd({ adType }) as Promise<ApiResponse<{ earnPoints: number; balance: number }>>,
  signIn: () =>
    getService('points-service').signIn() as Promise<ApiResponse<{ earnPoints: number; balance: number }>>,
  consumePoints: (cardId: string, points: number) =>
    getService('points-service').consumePoints({ cardId, points }) as Promise<ApiResponse>,
  getSignInStatus: () =>
    getService('points-service').getSignInStatus() as Promise<ApiResponse<{ hasSigned: boolean }>>,
  addFreeViews: () =>
    getService('points-service').addFreeViews() as Promise<ApiResponse<{ addViews: number; freeViews: number }>>,
  consumeFreeView: () =>
    getService('points-service').consumeFreeView() as Promise<ApiResponse<{ remaining: number }>>
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

export interface AdminCardPayload extends Partial<Card> {
  _id?: string
}

export interface AdminCategoryPayload extends Partial<Category> {
  _id?: string
}

export const adminApi = {
  checkAdmin: () => getService('admin-service').checkAdmin() as Promise<ApiResponse<AdminCheckResult>>,
  getStats: () => getService('admin-service').getStats() as Promise<ApiResponse<AdminStatsResult>>,
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
    getService('admin-service').deleteCategory({ categoryId }) as Promise<ApiResponse>
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

export const achievementApi = {
  recordLearning: (cardId: string, duration?: number) =>
    getService('achievement-service').recordLearning({ cardId, duration }) as Promise<
      ApiResponse<{
        isNewCard: boolean
        newAchievements: Achievement[]
      }>
    >,
  getLearningProgress: () =>
    getService('achievement-service').getLearningProgress() as Promise<ApiResponse<LearningProgress>>,
  getAchievements: () =>
    getService('achievement-service').getAchievements() as Promise<ApiResponse<AchievementsResult>>,
  checkAndUnlockAchievements: () =>
    getService('achievement-service').checkAndUnlockAchievements() as Promise<
      ApiResponse<{
        newAchievements: Achievement[]
      }>
    >
}
