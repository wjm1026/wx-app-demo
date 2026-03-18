import { getService } from './shared'
import type {
  Achievement,
  ApiResponse,
  Card,
  Category,
  HomeDataResult,
  PagedResult,
  SearchCardsResult,
} from './types'

export const cardApi = {
  /** 获取分类列表 */
  getCategories: () => getService('card-service').getCategories() as Promise<ApiResponse<Category[]>>,
  /** 获取首页数据 */
  getHomeData: () => getService('card-service').getHomeData() as Promise<ApiResponse<HomeDataResult>>,
  /** 按分类获取卡片列表 */
  getCardsByCategory: (params: { categoryId: string; page?: number; pageSize?: number }) =>
    getService('card-service').getCardsByCategory(params) as Promise<ApiResponse<PagedResult<Card>>>,
  /** 搜索卡片列表 */
  searchCards: (params: { keyword: string; page?: number; pageSize?: number }) =>
    getService('card-service').searchCards(params) as Promise<ApiResponse<SearchCardsResult>>,
  /** 获取卡片详情 */
  getCardDetail: (cardId: string) =>
    getService('card-service').getCardDetail({ cardId }) as Promise<ApiResponse<Card>>,
  /** 切换收藏 */
  toggleFavorite: (cardId: string) =>
    getService('card-service').toggleFavorite({ cardId }) as Promise<
      ApiResponse<{ isFavorited: boolean; newAchievements?: Achievement[] }>
    >,
  /** 获取收藏列表 */
  getFavorites: (params?: { page?: number; pageSize?: number }) =>
    getService('card-service').getFavorites(params) as Promise<ApiResponse<PagedResult<Card>>>,
  /** 获取相关推荐卡片 */
  getRelatedCards: (params: { cardId: string; categoryId: string; limit?: number }) =>
    getService('card-service').getRelatedCards(params) as Promise<ApiResponse<Card[]>>,
  /** 初始化数据 */
  initData: () => getService('card-service').initData() as Promise<ApiResponse>,
  /** 修复卡片图片 */
  repairCardImages: () =>
    getService('card-service').repairCardImages() as Promise<ApiResponse<{ cardCount: number; categoryCount: number }>>,
}
