import { apiFetch } from '../sync/api'

interface ApiOpts {
  dataKey?: string
  requestKey?: string
}

type Params = Record<string, string | number>

export function api<T extends { id: string }>(endpoint: string, opts: ApiOpts = {}) {
  const { dataKey, requestKey } = opts
  const toParams = (p?: Record<string, unknown>) => p as Params | undefined

  return {
    get: async (params?: Record<string, unknown>) => {
      const { data } = await apiFetch<T[]>({ method: 'GET', endpoint, params: toParams(params), dataKey })
      return data
    },
    getOne: async (params: { id: string }) => {
      const { data } = await apiFetch<T>({ method: 'GET', endpoint, params: params as Params, dataKey })
      return data
    },
    create: async (body: Omit<T, 'id'> | T) => {
      const { data } = await apiFetch<T>({ method: 'POST', endpoint, body, dataKey, requestKey })
      return data
    },
    set: async (body: T) => {
      const { data } = await apiFetch<T>({ method: 'PUT', endpoint, params: { id: body.id }, body, dataKey, requestKey })
      return data
    },
    patch: async (body: Partial<T> & { id: string }) => {
      const { data } = await apiFetch<T>({ method: 'PATCH', endpoint, params: { id: body.id }, body, dataKey, requestKey })
      return data
    },
    delete: async (params: { id: string }) => {
      await apiFetch<void>({ method: 'DELETE', endpoint, params: params as Params })
    },
  }
}
