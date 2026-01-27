// 获取云对象实例的辅助函数
const getService = (name: string) => uniCloud.importObject(name)

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data?: T
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
}

export interface Category {
  _id: string
  name: string
  icon: string
  cover: string
  card_count: number
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
}

export const userApi = {
  loginByWeixin: (code: string, inviteCode?: string) => 
    getService('user-center').loginByWeixin({ code, inviteCode }) as Promise<ApiResponse>,
  getUserInfo: () => 
    getService('user-center').getUserInfo() as Promise<ApiResponse<UserInfo>>,
  updateUserInfo: (params: { nickname?: string; avatar?: string; gender?: number }) =>
    getService('user-center').updateUserInfo(params) as Promise<ApiResponse>,
  getInviteInfo: () =>
    getService('user-center').getInviteInfo() as Promise<ApiResponse>,
  getPointsLog: (params?: { page?: number; pageSize?: number }) =>
    getService('user-center').getPointsLog(params) as Promise<ApiResponse>
}

export const cardApi = {
  getCategories: () =>
    getService('card-service').getCategories() as Promise<ApiResponse<Category[]>>,
  getHomeData: () =>
    getService('card-service').getHomeData() as Promise<ApiResponse<{
      categories: Category[]
      hotCards: Card[]
      recentCards: Card[]
    }>>,
  getCardsByCategory: (params: { categoryId: string; page?: number; pageSize?: number }) =>
    getService('card-service').getCardsByCategory(params) as Promise<ApiResponse<{
      list: Card[]
      total: number
      page: number
      pageSize: number
    }>>,
  searchCards: (params: { keyword: string; page?: number; pageSize?: number }) =>
    getService('card-service').searchCards(params) as Promise<ApiResponse<{
      list: Card[]
      keyword: string
      page: number
      pageSize: number
    }>>,
  getCardDetail: (cardId: string) =>
    getService('card-service').getCardDetail({ cardId }) as Promise<ApiResponse<Card>>,
  toggleFavorite: (cardId: string) =>
    getService('card-service').toggleFavorite({ cardId }) as Promise<ApiResponse<{ isFavorited: boolean }>>,
  getFavorites: (params?: { page?: number; pageSize?: number }) =>
    getService('card-service').getFavorites(params) as Promise<ApiResponse>,
  getRelatedCards: (params: { cardId: string; categoryId: string; limit?: number }) =>
    getService('card-service').getRelatedCards(params) as Promise<ApiResponse<Card[]>>
}

export const pointsApi = {
  earnByAd: (adType: 'banner' | 'video') =>
    getService('points-service').earnByAd({ adType }) as Promise<ApiResponse<{
      earnPoints: number
      balance: number
    }>>,
  signIn: () =>
    getService('points-service').signIn() as Promise<ApiResponse<{
      earnPoints: number
      balance: number
    }>>,
  consumePoints: (cardId: string, points: number) =>
    getService('points-service').consumePoints({ cardId, points }) as Promise<ApiResponse>,
  getSignInStatus: () =>
    getService('points-service').getSignInStatus() as Promise<ApiResponse<{ hasSigned: boolean }>>,
  addFreeViews: () =>
    getService('points-service').addFreeViews() as Promise<ApiResponse<{
      addViews: number
      freeViews: number
    }>>,
  consumeFreeView: () =>
    getService('points-service').consumeFreeView() as Promise<ApiResponse<{ remaining: number }>>
}

export const adminApi = {
  checkAdmin: () =>
    getService('admin-service').checkAdmin() as Promise<ApiResponse<{ isAdmin: boolean; nickname: string; avatar: string }>>,
  getStats: () =>
    getService('admin-service').getStats() as Promise<ApiResponse>,
  getUserList: (params?: { page?: number; pageSize?: number; status?: number; keyword?: string }) =>
    getService('admin-service').getUserList(params) as Promise<ApiResponse>,
  getUserDetail: (userId: string) =>
    getService('admin-service').getUserDetail({ userId }) as Promise<ApiResponse>,
  updateUserStatus: (userId: string, status: number) =>
    getService('admin-service').updateUserStatus({ userId, status }) as Promise<ApiResponse>,
  adjustUserPoints: (userId: string, amount: number, reason?: string) =>
    getService('admin-service').adjustUserPoints({ userId, amount, reason }) as Promise<ApiResponse>,
  setUserRole: (userId: string, role: 'user' | 'admin') =>
    getService('admin-service').setUserRole({ userId, role }) as Promise<ApiResponse>,
  getCardList: (params?: { page?: number; pageSize?: number; categoryId?: string; keyword?: string }) =>
    getService('admin-service').getCardList(params) as Promise<ApiResponse>,
  saveCard: (cardData: any) =>
    getService('admin-service').saveCard(cardData) as Promise<ApiResponse>,
  deleteCard: (cardId: string) =>
    getService('admin-service').deleteCard({ cardId }) as Promise<ApiResponse>,
  getCategoryList: () =>
    getService('admin-service').getCategoryList() as Promise<ApiResponse>,
  saveCategory: (categoryData: any) =>
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

export const achievementApi = {
  recordLearning: (cardId: string, duration?: number) =>
    getService('achievement-service').recordLearning({ cardId, duration }) as Promise<ApiResponse<{
      isNewCard: boolean
      newAchievements: Achievement[]
    }>>,
  getLearningProgress: () =>
    getService('achievement-service').getLearningProgress() as Promise<ApiResponse<LearningProgress>>,
  getAchievements: () =>
    getService('achievement-service').getAchievements() as Promise<ApiResponse<{
      achievements: Achievement[]
      unlockedCount: number
      totalCount: number
    }>>,
  checkAndUnlockAchievements: () =>
    getService('achievement-service').checkAndUnlockAchievements() as Promise<ApiResponse<{
      newAchievements: Achievement[]
    }>>
}
