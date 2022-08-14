import _ from 'lodash'
import State from '../@types/State'
import { AlertType } from '../constants'

interface Options {
  alertType?: keyof typeof AlertType
  showCloseLink?: boolean
  value: string | null
  isInline?: boolean
}

/** Set an alert with an optional close link. */
const alert = (state: State, { alertType, showCloseLink, value, isInline = false }: Options) => {
  if (value === state.alert?.value) return state
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
