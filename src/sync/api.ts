import { getConfig } from '../config'
import type { ResponseMeta } from '../types'

interface FetchOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint: string
  params?: Record<string, string | number>
  body?: unknown
  dataKey?: string
  requestKey?: string
}

interface FetchResult<T> { data: T; meta: ResponseMeta }

function buildUrl(template: string, params: Record<string, string | number>): string {
  const used = new Set<string>()
  const path = template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key: string) => {
    if (!(key in params)) throw new Error(`Missing URL parameter: ${key}`)
    used.add(key)
    return encodeURIComponent(String(params[key]))
  })
  const query = Object.entries(params).filter(([k]) => !used.has(k))
  if (!query.length) return path
  const qs = query.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
  return `${path}?${qs}`
}

export async function apiFetch<T>(options: FetchOptions): Promise<FetchResult<T>> {
  const config = getConfig()
  const startTime = Date.now()
  const fullUrl = `${config.baseUrl}${buildUrl(options.endpoint, options.params ?? {})}`

  const configHeaders = await config.getHeaders?.() ?? {}
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...configHeaders }

  let body: string | undefined
  if (options.body !== undefined) {
    body = JSON.stringify(options.requestKey ? { [options.requestKey]: options.body } : options.body)
  }

  const response = await fetch(fullUrl, { method: options.method, headers, body })
  const duration = Date.now() - startTime

  if (!response.ok) {
    const errorBody = await response.text()
    let message = `HTTP ${response.status}`
    try { const p = JSON.parse(errorBody); message = p.message ?? p.error ?? message } catch {}
    throw new Error(`${options.method} ${options.endpoint}: ${message}`)
  }

  const meta: ResponseMeta = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    url: fullUrl,
    duration,
  }

  if (response.status === 204) return { data: undefined as T, meta }

  let json: Record<string, unknown>
  try { json = await response.json() } catch { throw new Error('Invalid JSON response') }

  let data: T
  if (options.dataKey && options.dataKey in json) {
    data = json[options.dataKey] as T
    for (const [key, value] of Object.entries(json)) if (key !== options.dataKey) meta[key] = value
  } else {
    data = json as T
  }

  return { data, meta }
}
