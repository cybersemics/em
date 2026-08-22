/**
 * AI data disclosure utility, which is used to request AI use and persist acknowledgement of the AI data
 * disclosure on this device.
 *
 * After implementing the sync engine, this should be revisited so that the acknowledgement is persisted for
 * all devices of a current user, but not across all users of the same shared thoughtspace.
 */
import storage from './storage'

/** Version of the AI data disclosure acknowledgement. */
const AI_DISCLOSURE_VERSION = 'v1'
/** Key for the AI data disclosure acknowledgement. */
const AI_DISCLOSURE_KEY = `aiDisclosureAcknowledged/${AI_DISCLOSURE_VERSION}`
/** Value for the AI data disclosure acknowledgement. */
const ACKNOWLEDGED_VALUE = '1'
/** Whether to allow one more AI use without persisting acknowledgement. */
let allowNextAiUse = false
/** The AI request to run after the user accepts the disclosure. */
let pendingAiUse: (() => void) | null = null

/** Returns true if the user has acknowledged the AI data disclosure on this device. */
export const hasAcknowledgedAiDisclosure = () => storage.getItem(AI_DISCLOSURE_KEY) === ACKNOWLEDGED_VALUE

/** Returns true if an AI request is waiting for the disclosure to be accepted. */
export const hasPendingAiUse = () => pendingAiUse !== null

/** Allows one AI use without persisting acknowledgement. */
export const allowAiDisclosureOnce = () => {
  allowNextAiUse = true
}

/** Consumes a one-time AI allowance, returning whether one was available. */
const consumeAiDisclosureAllowance = () => {
  if (!allowNextAiUse) return false
  allowNextAiUse = false
  return true
}

/** Queues an AI request if disclosure is required. Returns true when the disclosure must be shown. */
const requestAiDisclosure = (continuation: () => void) => {
  if (hasAcknowledgedAiDisclosure() || consumeAiDisclosureAllowance()) return false
  pendingAiUse = continuation
  return true
}

/** Persists acknowledgement of the AI data disclosure on this device. */
export const acknowledgeAiDisclosure = () => {
  storage.setItem(AI_DISCLOSURE_KEY, ACKNOWLEDGED_VALUE)
}

/** Allows the pending AI request and returns it for the caller to run. */
export const acceptAiDisclosure = ({ remember }: { remember: boolean }): (() => void) | null => {
  if (remember) {
    acknowledgeAiDisclosure()
  } else {
    allowAiDisclosureOnce()
  }

  const continuation = pendingAiUse
  pendingAiUse = null
  return continuation
}

/** Discards the AI request pending disclosure. */
export const cancelAiDisclosure = () => {
  pendingAiUse = null
}

/** Revokes AI data disclosure acknowledgement and clears any pending or one-time AI use. */
export const clearAiDisclosureAcknowledgement = () => {
  storage.removeItem(AI_DISCLOSURE_KEY)
  allowNextAiUse = false
  pendingAiUse = null
}

export default requestAiDisclosure
