/** Everhour task estimate in seconds. */
export interface EverhourEstimate {
  total: number
  users?: Record<string, number>
}

/** Everhour task object (subset of fields we use). */
export interface EverhourTask {
  id: string
  name: string
  time?: { total?: number }
  estimate?: EverhourEstimate
  projects?: string[]
}

/** Options for the Everhour client. */
export interface EverhourClientOptions {
  apiKey: string
  baseUrl?: string
}
