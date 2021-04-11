import axios from 'axios'
import { FEEDBACK_URL } from '../constants'

/**
 * Send feedback to the support.
 */
export const submitFeedback = (feedback: string, userId?: string) => axios.post(FEEDBACK_URL, {
  feedback,
  userId
})
