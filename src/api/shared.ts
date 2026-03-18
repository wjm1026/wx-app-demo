import { AUTH_PARAM_KEY, readStoredAuthToken } from '@/auth'

export type ServiceName =
  | 'user-center'
  | 'card-service'
  | 'points-service'
  | 'admin-service'
  | 'achievement-service'

const serviceCache = new Map<ServiceName, ReturnType<typeof uniCloud.importObject>>()

export const getService = <T extends ServiceName>(name: T) => {
  const cached = serviceCache.get(name)
  if (cached) {
    return cached
  }

  // 统一关闭 uniCloud 云对象自带的 loading / error UI，交给页面层自己控制。
  const rawService = uniCloud.importObject(name, {
    customUI: true,
  })
  const service = new Proxy(rawService, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') {
        return value
      }

      return (params?: unknown) => {
        const token = readStoredAuthToken()
        if (!params || typeof params !== 'object' || Array.isArray(params)) {
          const nextParams = token ? { [AUTH_PARAM_KEY]: token } : params
          return value.call(target, nextParams)
        }

        const nextParams = token
          ? {
              ...params,
              [AUTH_PARAM_KEY]: token,
            }
          : params

        return value.call(target, nextParams)
      }
    },
  })

  serviceCache.set(name, service)
  return service
}
