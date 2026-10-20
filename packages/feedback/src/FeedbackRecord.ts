import FeedbackPayload from '../shared/FeedbackPayload'

/** A persisted submission, including private fields used only to authorize its upload session. */
interface FeedbackRecord {
  id: string
  token_hash: string
  payload_hash: string
  payload: FeedbackPayload
  created_at: string
  submitted_at: string | null
}

export default FeedbackRecord
