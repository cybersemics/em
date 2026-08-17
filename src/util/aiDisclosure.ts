import storage from './storage'

const AI_DISCLOSURE_VERSION = 'v1'
const AI_DISCLOSURE_KEY = `aiDisclosureAcknowledged/${AI_DISCLOSURE_VERSION}`
const ACKNOWLEDGED_VALUE = '1'
let allowNextAiUse = false
let pendingAiUse: (() => void) | null = null

/** Returns true if the user has acknowledged the AI data disclosure on this device. */
export const hasAcknowledgedAiDisclosure = () => storage.getItem(AI_DISCLOSURE_KEY) === ACKNOWLEDGED_VALUE

/** Allows one AI use without persisting acknowledgement. */
export const allowAiDisclosureOnce = () => {
  allowNextAiUse = true
}

/** Consumes a one-time AI allowance, returning whether one was available. */
export const consumeAiDisclosureAllowance = () => {
  if (!allowNextAiUse) return false
  allowNextAiUse = false
  return true
}

/** Stores an AI request to run after the user accepts the disclosure. */
export const requestAiDisclosure = (continuation: () => void) => {
  pendingAiUse = continuation
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

/** Persists acknowledgement of the AI data disclosure on this device. */
export const acknowledgeAiDisclosure = () => {
  storage.setItem(AI_DISCLOSURE_KEY, ACKNOWLEDGED_VALUE)
}

/** Clears persisted AI data disclosure acknowledgement. Intended for tests. */
export const clearAiDisclosureAcknowledgement = () => {
  storage.removeItem(AI_DISCLOSURE_KEY)
  allowNextAiUse = false
  pendingAiUse = null
}
