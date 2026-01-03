import type { KStateConfig } from './types'

let globalConfig: KStateConfig = {
  baseUrl: '',
  getHeaders: () => ({}),
  onError: undefined,
}

export function configureKState(config: KStateConfig): void {
  globalConfig = { ...globalConfig, ...config }
}

export function getConfig(): KStateConfig {
  return globalConfig
}
