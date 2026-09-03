import type { FC } from 'react'
import { AlertType } from '../constants'

export type AlertValue = string | FC | null

type Alert = {
  alertType?: keyof typeof AlertType
  value: AlertValue
  /** Used to cancel imports. */
  importFileId?: string
  /** Timeout in milliseconds after which alert will be cleared. Default: 5000. Set to null to prevent auto-dismiss. */
  clearDelay?: number | null
}

export default Alert
