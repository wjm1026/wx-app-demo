import { getService } from './shared'
import type {
  ApiResponse,
  Card,
  Category,
  HomeDataResult,
  PagedResult,
  SearchCardsResult,
} from './types'

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
  initData: () => getService('card-service').initData() as Promise<ApiResponse>,
  repairCardImages: () =>
    getService('card-service').repairCardImages() as Promise<ApiResponse<{ cardCount: number; categoryCount: number }>>,
}

