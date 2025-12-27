import { AlertType } from '../constants'

type Alert = {
  alertType?: keyof typeof AlertType
  value: string | null
  /** Used to cancel imports. */
  importFileId?: string
  /** Timeout in milliseconds after which alert will be cleared. Default: 5000. Set to null to prevent auto-dismiss. */
  clearDelay?: number | null
}

export default Alert
