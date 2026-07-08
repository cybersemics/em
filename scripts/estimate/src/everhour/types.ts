/** Everhour task estimate in seconds. */
export interface EverhourEstimate {
  total: number
  users?: Record<string, number>
}

/** Everhour task object (subset of fields we use). */
export interface EverhourTask {
  id: string
  name: string
  /** GitHub issue number string returned by Everhour for GitHub-linked tasks. */
  number?: string
  /** GitHub issue/PR URL returned by Everhour for GitHub-linked tasks, e.g. ".../issues/76". */
  url?: string
  /** GitHub issue number string returned by some Everhour API versions for GitHub-linked tasks. */
  foreignId?: string
  time?: { total?: number }
  estimate?: EverhourEstimate
  projects?: string[]
}

/** Everhour project object (subset of fields we use). */
export interface EverhourProject {
  id: string
  name: string
}

/** Options for the Everhour client. */
export interface EverhourClientOptions {
  apiKey: string
  baseUrl?: string
}
