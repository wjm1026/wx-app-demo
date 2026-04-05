import { apiGet, apiPost } from './shared'
import type {
  Achievement,
  ApiResponse,
  Card,
  CardLite,
  Category,
  DisplayConfigResult,
  FavoritesPageResult,
  OpenCardResult,
  PagedResult,
} from './types'

export const cardApi = {
  /** 获取首页 Logo + 游戏配置 */
  getDisplayConfig: () =>
    apiGet<DisplayConfigResult>('/api/v1/display-config') as Promise<ApiResponse<DisplayConfigResult>>,
  /** 获取分类列表 */
  getCategories: () => apiGet<Category[]>('/api/v1/categories') as Promise<ApiResponse<Category[]>>,
  /** 按分类获取卡片列表 */
  getCardsByCategory: (params: {
    categoryId: string
    page?: number
    pageSize?: number
    fields?: 'lite'
  }) =>
    apiGet<PagedResult<Card>>('/api/v1/cards', params) as Promise<ApiResponse<PagedResult<Card>>>,
  /** 按分类获取轻量卡片快照 */
  getCardsByCategoryLite: (params: { categoryId: string; page?: number; pageSize?: number }) =>
    apiGet<PagedResult<CardLite>>('/api/v1/cards', {
      ...params,
      fields: 'lite',
    }) as Promise<ApiResponse<PagedResult<CardLite>>>,
  /** 打开卡片详情（必要时解锁） */
  openCard: (cardId: string, payload?: { track_view?: boolean }) =>
    apiPost<OpenCardResult>(
      `/api/v1/cards/${encodeURIComponent(cardId)}:open`,
      payload,
    ) as Promise<ApiResponse<OpenCardResult>>,
  /** 切换收藏 */
  toggleFavorite: (cardId: string) =>
    apiPost<{ isFavorited: boolean; newAchievements?: Achievement[] }>(
      `/api/v1/cards/${encodeURIComponent(cardId)}/favorite`,
    ) as Promise<
      ApiResponse<{ isFavorited: boolean; newAchievements?: Achievement[] }>
    >,
  /** 获取收藏列表 */
  getFavorites: (params?: { page?: number; pageSize?: number }) =>
    apiGet<FavoritesPageResult>('/api/v1/cards/favorites', params) as Promise<ApiResponse<FavoritesPageResult>>,
  /** 初始化数据 */
  initData: () => apiPost('/api/v1/cards/init-data') as Promise<ApiResponse>,
  /** 修复卡片图片 */
  repairCardImages: () =>
    apiPost<{ cardCount: number; categoryCount: number }>(
      '/api/v1/cards/repair-images',
    ) as Promise<ApiResponse<{ cardCount: number; categoryCount: number }>>,
}
