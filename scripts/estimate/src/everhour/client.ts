import type { EverhourClientOptions, EverhourProject, EverhourTask } from './types.ts'

const DEFAULT_BASE_URL = 'https://api.everhour.com'
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

/** Everhour REST API client. */
class EverhourClient {
  private apiKey: string
  private baseUrl: string

  constructor(options: EverhourClientOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
  }

  /** Makes an authenticated request to the Everhour API with retry logic. */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      ...(options.headers as Record<string, string>),
    }

    let lastError: Error | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, { ...options, headers })
        if (!response.ok) {
          const body = await response.text().catch(() => '')
          throw new Error(`Everhour API error ${response.status}: ${body}`)
        }
        return (await response.json()) as T
      } catch (error) {
        lastError = error as Error
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
        }
      }
    }
    throw lastError!
  }

  /** Fetches a single project by ID. Throws if the project does not exist. */
  async getProject(projectId: string): Promise<EverhourProject> {
    return this.request<EverhourProject>(`/projects/${projectId}`)
  }

  /**
   * Fetches a single page of tasks for a project. The Everhour tasks endpoint is paginated
   * via `limit` (page size, max 250) and `page` (1-based); a page shorter than `limit`
   * indicates the last page. Callers should page through results rather than assuming the
   * first response contains every task.
   */
  async getProjectTasks(projectId: string, page = 1, limit = 250): Promise<EverhourTask[]> {
    return this.request<EverhourTask[]>(`/projects/${projectId}/tasks?limit=${limit}&page=${page}`)
  }

  /** Sets the estimate for a task in seconds. */
  async setEstimate(taskId: string, seconds: number): Promise<void> {
    await this.request(`/tasks/${taskId}/estimate`, {
      method: 'PUT',
      body: JSON.stringify({ total: seconds }),
    })
  }

  /** Gets a single task by ID. */
  async getTask(taskId: string): Promise<EverhourTask> {
    return this.request<EverhourTask>(`/tasks/${taskId}`)
  }
}

export default EverhourClient
