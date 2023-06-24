import { AlertType } from '../constants'

type Alert = {
  alertType?: keyof typeof AlertType
  showCloseLink?: boolean
  value: string | null
  isInline?: boolean
  // used to cancel imports
  importFileId?: string
}

export default Alert
