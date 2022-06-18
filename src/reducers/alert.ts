import _ from 'lodash'
import State from '../@types/State'

interface Options {
  alertType?: string
  showCloseLink?: boolean
  value: string | null
  isInline?: boolean
}

/** Set an alert with an optional close link. */
const alert = (state: State, { alertType, showCloseLink, value, isInline = false }: Options) => {
  return {
    ...state,
    alert: value
      ? {
          alertType,
          showCloseLink: showCloseLink !== false,
          value,
          isInline,
        }
      : null,
  }
}

export default _.curryRight(alert)
