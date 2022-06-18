import axios from 'axios'
import { FEEDBACK_URL } from '../constants'

/**
 * Send feedback to the support.
 */
const submitFeedback = (feedback: string, userId?: string) =>
  axios.post(FEEDBACK_URL, {
    feedback,
    userId,
  })

export default submitFeedback
