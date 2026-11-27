import type { FC } from 'react'
import { AlertType } from '../constants'

/**
 * One piece of an alert message built with `alertMessage`. A plain string is fixed text. A `{ thought }` piece holds a
 * thought value, which AlertMessage shrinks with an ellipsis when the line is wider than the screen.
 */
export type AlertPart = string | { thought: string }

/** Alert values must stay serializable, since they are stored in Redux. A function component is the one exception. */
export type AlertValue = string | AlertPart[] | FC | null

type Alert = {
  alertType?: keyof typeof AlertType
  value: AlertValue
  /** Used to cancel imports. */
  importFileId?: string
  /** Timeout in milliseconds after which alert will be cleared. Default: 5000. Set to null to prevent auto-dismiss. */
  clearDelay?: number | null
}

export default Alert
