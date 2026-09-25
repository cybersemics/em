/**
 * AI data disclosure utility, which is used to request AI use and persist acknowledgement of the AI data
 * disclosure on this device.
 *
 * After implementing the sync engine, this should be revisited so that the acknowledgement is persisted for
 * all devices of a current user, but not across all users of the same shared thoughtspace.
 */
import ministore from '../stores/ministore'
import storage from './storage'

/** Version of the AI data disclosure acknowledgement. */
const AI_DISCLOSURE_VERSION = 'v1'
/** Key for the AI data disclosure acknowledgement. */
const AI_DISCLOSURE_KEY = `aiDisclosureAcknowledged/${AI_DISCLOSURE_VERSION}`
/** Value for the AI data disclosure acknowledgement. */
const ACKNOWLEDGED_VALUE = '1'

/** The in-memory half of the disclosure state: a ministore rather than module variables so that it is restored between tests along with every other store. Both fields live in one object because ministore.update calls a function argument as an updater, so the continuation can only be stored as a field. */
const aiUseStore = ministore<{
  /** Whether to allow one more AI use without persisting acknowledgement. */
  allowNext: boolean
  /** The AI request to run after the user accepts the disclosure. */
  pending: (() => void) | null
}>({ allowNext: false, pending: null })

/** Returns true if the user has acknowledged the AI data disclosure on this device. */
export const hasAcknowledgedAiDisclosure = () => storage.getItem(AI_DISCLOSURE_KEY) === ACKNOWLEDGED_VALUE

/** Returns true if an AI request is waiting for the disclosure to be accepted. */
export const hasPendingAiUse = () => aiUseStore.getState().pending !== null

/** Allows one AI use without persisting acknowledgement. */
export const allowAiDisclosureOnce = () => {
  aiUseStore.update({ allowNext: true })
}

/** Consumes a one-time AI allowance, returning whether one was available. */
const consumeAiDisclosureAllowance = () => {
  if (!aiUseStore.getState().allowNext) return false
  aiUseStore.update({ allowNext: false })
  return true
}

/** Queues an AI request if disclosure is required. Returns true when the disclosure must be shown. */
const requestAiDisclosure = (continuation: () => void) => {
  if (hasAcknowledgedAiDisclosure() || consumeAiDisclosureAllowance()) return false
  aiUseStore.update({ pending: continuation })
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

  const continuation = aiUseStore.getState().pending
  aiUseStore.update({ pending: null })
  return continuation
}

/** Discards the AI request pending disclosure. */
export const cancelAiDisclosure = () => {
  aiUseStore.update({ pending: null })
}

/** Revokes AI data disclosure acknowledgement on this device. */
export const clearAiDisclosureAcknowledgement = () => {
  storage.removeItem(AI_DISCLOSURE_KEY)
}

export default requestAiDisclosure
