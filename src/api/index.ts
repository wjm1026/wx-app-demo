const userCenter = uniCloud.importObject('user-center')
const cardService = uniCloud.importObject('card-service')
const pointsService = uniCloud.importObject('points-service')

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
    userCenter.loginByWeixin({ code, inviteCode }) as Promise<ApiResponse>,
  
  getUserInfo: () => 
    userCenter.getUserInfo() as Promise<ApiResponse<UserInfo>>,
  
  updateUserInfo: (params: { nickname?: string; avatar?: string; gender?: number }) =>
    userCenter.updateUserInfo(params) as Promise<ApiResponse>,
  
  getInviteInfo: () =>
    userCenter.getInviteInfo() as Promise<ApiResponse>,
  
  getPointsLog: (params?: { page?: number; pageSize?: number }) =>
    userCenter.getPointsLog(params) as Promise<ApiResponse>
}

export const cardApi = {
  getCategories: () =>
    cardService.getCategories() as Promise<ApiResponse<Category[]>>,
  
  getHomeData: () =>
    cardService.getHomeData() as Promise<ApiResponse<{
      categories: Category[]
      hotCards: Card[]
      recentCards: Card[]
    }>>,
  
  getCardsByCategory: (params: { categoryId: string; page?: number; pageSize?: number }) =>
    cardService.getCardsByCategory(params) as Promise<ApiResponse<{
      list: Card[]
      total: number
      page: number
      pageSize: number
    }>>,
  
  searchCards: (params: { keyword: string; page?: number; pageSize?: number }) =>
    cardService.searchCards(params) as Promise<ApiResponse<{
      list: Card[]
      keyword: string
      page: number
      pageSize: number
    }>>,
  
  getCardDetail: (cardId: string) =>
    cardService.getCardDetail({ cardId }) as Promise<ApiResponse<Card>>,
  
  toggleFavorite: (cardId: string) =>
    cardService.toggleFavorite({ cardId }) as Promise<ApiResponse<{ isFavorited: boolean }>>,
  
  getFavorites: (params?: { page?: number; pageSize?: number }) =>
    cardService.getFavorites(params) as Promise<ApiResponse>,
  
  getRelatedCards: (params: { cardId: string; categoryId: string; limit?: number }) =>
    cardService.getRelatedCards(params) as Promise<ApiResponse<Card[]>>
}

export const pointsApi = {
  earnByAd: (adType: 'banner' | 'video') =>
    pointsService.earnByAd({ adType }) as Promise<ApiResponse<{
      earnPoints: number
      balance: number
    }>>,
  
  signIn: () =>
    pointsService.signIn() as Promise<ApiResponse<{
      earnPoints: number
      balance: number
    }>>,
  
  consumePoints: (cardId: string, points: number) =>
    pointsService.consumePoints({ cardId, points }) as Promise<ApiResponse>,
  
  getSignInStatus: () =>
    pointsService.getSignInStatus() as Promise<ApiResponse<{ hasSigned: boolean }>>,
  
  addFreeViews: () =>
    pointsService.addFreeViews() as Promise<ApiResponse<{
      addViews: number
      freeViews: number
    }>>,
  
  consumeFreeView: () =>
    pointsService.consumeFreeView() as Promise<ApiResponse<{ remaining: number }>>
}
