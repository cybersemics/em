import { AlertType } from '../constants'

type Alert = {
  alertType?: keyof typeof AlertType
  showCloseLink?: boolean
  value: string | null
  // used to cancel imports
  importFileId?: string
}

export default Alert
