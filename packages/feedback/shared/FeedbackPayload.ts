/** A feedback submission, including only explicitly selected optional diagnostics. */
interface FeedbackPayload {
  name: string
  email: string
  message: string
  thoughts?: string
  debugLog?: string
  metadata: {
    version: string
    commit: string
    userAgent: string
    platform: string
    resolution?: { width: number; height: number; pixelRatio: number }
  }
  files: { name: string; size: number; contentType: string }[]
}

export default FeedbackPayload
