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

interface FetchResult<T> {
  data: T
  meta: ResponseMeta
}

function buildUrl(
  template: string,
  params: Record<string, string | number>
): { url: string; queryParams: Record<string, string | number> } {
  const queryParams: Record<string, string | number> = {}
  const usedKeys = new Set<string>()

  const url = template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, key: string) => {
    if (key in params) {
      usedKeys.add(key)
      return encodeURIComponent(String(params[key]))
    }
    throw new Error(`Missing URL parameter: ${key}`)
  })

  for (const [key, value] of Object.entries(params)) {
    if (!usedKeys.has(key)) {
      queryParams[key] = value
    }
  }

  return { url, queryParams }
}

function appendQueryString(
  url: string,
  params: Record<string, string | number>
): string {
  const entries = Object.entries(params)
  if (entries.length === 0) return url

  const queryString = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

  return `${url}?${queryString}`
}

export async function apiFetch<T>(options: FetchOptions): Promise<FetchResult<T>> {
  const config = getConfig()
  const startTime = Date.now()

  // Build URL
  const { url: pathUrl, queryParams } = buildUrl(
    options.endpoint,
    options.params ?? {}
  )
  const fullUrl = appendQueryString(
    `${config.baseUrl}${pathUrl}`,
    queryParams
  )

  // Build headers
  const configHeaders = await config.getHeaders?.() ?? {}
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...configHeaders,
  }

  // Build body
  let body: string | undefined
  if (options.body !== undefined) {
    const payload = options.requestKey
      ? { [options.requestKey]: options.body }
      : options.body
    body = JSON.stringify(payload)
  }

  // Execute fetch
  const response = await fetch(fullUrl, {
    method: options.method,
    headers,
    body,
  })

  const duration = Date.now() - startTime

  if (!response.ok) {
    const errorBody = await response.text()
    let message = `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(errorBody)
      message = parsed.message ?? parsed.error ?? message
    } catch {
      // Keep default message
    }
    throw new Error(message)
  }

  // Handle empty response (204 No Content)
  if (response.status === 204) {
    return {
      data: undefined as T,
      meta: {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        url: fullUrl,
        duration,
      },
    }
  }

  let json: Record<string, unknown>
  try {
    json = await response.json()
  } catch {
    throw new Error('Invalid JSON response')
  }

  // Extract data using dataKey
  let data: T
  const meta: ResponseMeta = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    url: fullUrl,
    duration,
  }

  if (options.dataKey && options.dataKey in json) {
    data = json[options.dataKey] as T
    for (const [key, value] of Object.entries(json)) {
      if (key !== options.dataKey) meta[key] = value
    }
  } else {
    data = json as T
  }

  return { data, meta }
}
