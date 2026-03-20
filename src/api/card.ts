import { apiGet, apiPost } from './shared'
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
  getCategories: () => apiGet<Category[]>('/api/v1/categories') as Promise<ApiResponse<Category[]>>,
  /** 获取首页数据 */
  getHomeData: () => apiGet<HomeDataResult>('/api/v1/cards/home') as Promise<ApiResponse<HomeDataResult>>,
  /** 按分类获取卡片列表 */
  getCardsByCategory: (params: { categoryId: string; page?: number; pageSize?: number }) =>
    apiGet<PagedResult<Card>>('/api/v1/cards', params) as Promise<ApiResponse<PagedResult<Card>>>,
  /** 搜索卡片列表 */
  searchCards: (params: { keyword: string; page?: number; pageSize?: number }) =>
    apiGet<SearchCardsResult>('/api/v1/cards/search', params) as Promise<ApiResponse<SearchCardsResult>>,
  /** 获取卡片详情 */
  getCardDetail: (cardId: string) =>
    apiGet<Card>(`/api/v1/cards/${encodeURIComponent(cardId)}`) as Promise<ApiResponse<Card>>,
  /** 切换收藏 */
  toggleFavorite: (cardId: string) =>
    apiPost<{ isFavorited: boolean; newAchievements?: Achievement[] }>(
      `/api/v1/cards/${encodeURIComponent(cardId)}/favorite`,
    ) as Promise<
      ApiResponse<{ isFavorited: boolean; newAchievements?: Achievement[] }>
    >,
  /** 获取收藏列表 */
  getFavorites: (params?: { page?: number; pageSize?: number }) =>
    apiGet<PagedResult<Card>>('/api/v1/cards/favorites', params) as Promise<ApiResponse<PagedResult<Card>>>,
  /** 获取相关推荐卡片 */
  getRelatedCards: (params: { cardId: string; categoryId: string; limit?: number }) =>
    apiGet<Card[]>(
      `/api/v1/cards/${encodeURIComponent(params.cardId)}/related`,
      {
        categoryId: params.categoryId,
        limit: params.limit,
      },
    ) as Promise<ApiResponse<Card[]>>,
  /** 初始化数据 */
  initData: () => apiPost('/api/v1/cards/init-data') as Promise<ApiResponse>,
  /** 修复卡片图片 */
  repairCardImages: () =>
    apiPost<{ cardCount: number; categoryCount: number }>(
      '/api/v1/cards/repair-images',
    ) as Promise<ApiResponse<{ cardCount: number; categoryCount: number }>>,
}
