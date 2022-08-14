import { AlertType } from '../constants'

type Alert = {
  alertType?: keyof typeof AlertType
  showCloseLink?: boolean
  value: string | null
  isInline?: boolean
} | null

export default Alert
