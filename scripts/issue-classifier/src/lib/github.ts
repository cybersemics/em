const DEFAULT_BASE_URL = 'https://api.github.com'
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000
const PAGE_SIZE = 100

/** An open GitHub milestone that an issue can be assigned to. */
export interface Milestone {
  /** Milestone number, which is what the issues API accepts when assigning. */
  number: number
  title: string
  /** Milestone description, or an empty string. Most milestones in this repo have none. */
  description: string
}

/** The subset of a GitHub issue the classifier reads. */
export interface Issue {
  number: number
  title: string
  body: string
  labels: string[]
  /** Title of the milestone already assigned to the issue, or null when it has none. */
  milestone: string | null
  /** Whether the "issue" is really a pull request. The issues API returns both. */
  isPullRequest: boolean
}

/** Options for constructing a GitHubClient. */
export interface GitHubClientOptions {
  /** Repository in `owner/name` form. */
  repo: string
  /** Token used to authenticate. Omit for unauthenticated reads of a public repository. */
  token?: string
  baseUrl?: string
}

/** Shape of a milestone as returned by the GitHub REST API. */
interface MilestoneResponse {
  number: number
  title: string
  description: string | null
}

/** Shape of an issue as returned by the GitHub REST API. */
interface IssueResponse {
  number: number
  title: string
  body: string | null
  labels: { name: string }[]
  milestone: { title: string } | null
  pull_request?: unknown
}

/**
 * GitHub REST API client covering the four calls the classifier makes: list open milestones, read
 * an issue, assign a milestone, and post a comment.
 *
 * The token is optional so that read-only and `--dry` runs work against a public repository with no
 * credentials at all, which is what lets `yarn evaluate` run locally with only an OpenAI key.
 */
class GitHubClient {
  private repo: string
  private token: string | undefined
  private baseUrl: string

  constructor(options: GitHubClientOptions) {
    this.repo = options.repo
    this.token = options.token
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
  }

  /**
   * Makes a request to the GitHub API, retrying transient failures.
   *
   * Only network errors and 5xx responses are retried. A 4xx is a deterministic answer — a missing
   * issue, a bad token, a milestone that does not exist — so repeating it wastes the workflow's time
   * and buries the real cause behind the last of three identical failures.
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers as Record<string, string>),
    }

    let lastError: Error | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // A failed fetch is a transport failure and is always worth retrying; a response that arrived
      // is judged on its status instead.
      let response: Response | null = null
      try {
        response = await fetch(url, { ...options, headers })
      } catch (error) {
        lastError = error as Error
      }

      if (response) {
        // 204 No Content is a success with no JSON body to parse.
        if (response.ok) return (response.status === 204 ? undefined : await response.json()) as T
        const body = await response.text().catch(() => '')
        const error = new Error(`GitHub API error ${response.status} for ${path}: ${body}`)
        if (response.status < 500) throw error
        lastError = error
      }

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
      }
    }
    throw lastError!
  }

  /**
   * Fetches every open milestone, paging until a short page signals the last one. Closed milestones
   * are never returned, so a closed milestone can never reach the prompt or be assigned.
   */
  async listOpenMilestones(): Promise<Milestone[]> {
    const milestones: Milestone[] = []
    let page = 1
    while (true) {
      const response = await this.request<MilestoneResponse[]>(
        `/repos/${this.repo}/milestones?state=open&per_page=${PAGE_SIZE}&page=${page}`,
      )
      milestones.push(...response.map(m => ({ number: m.number, title: m.title, description: m.description ?? '' })))
      if (response.length < PAGE_SIZE) return milestones
      page++
    }
  }

  /** Fetches a single issue. */
  async getIssue(issueNumber: number): Promise<Issue> {
    const response = await this.request<IssueResponse>(`/repos/${this.repo}/issues/${issueNumber}`)
    return {
      number: response.number,
      title: response.title,
      body: response.body ?? '',
      labels: response.labels.map(label => label.name),
      milestone: response.milestone?.title ?? null,
      isPullRequest: response.pull_request != null,
    }
  }

  /** Assigns a milestone to an issue by milestone number. */
  async setMilestone(issueNumber: number, milestoneNumber: number): Promise<void> {
    await this.request(`/repos/${this.repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ milestone: milestoneNumber }),
    })
  }

  /** Posts a comment on an issue. */
  async comment(issueNumber: number, body: string): Promise<void> {
    await this.request(`/repos/${this.repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
  }
}

export default GitHubClient
