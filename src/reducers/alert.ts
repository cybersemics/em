import _ from 'lodash'
import { State } from '../util/initialState'

interface Options {
  alertType?: string,
  showCloseLink?: boolean,
  value: string | null,
}

/** Set an alert with an optional close link. */
const alert = (state: State, { alertType, showCloseLink, value }: Options) => ({
  ...state,
  alert: value ? {
    alertType,
    showCloseLink: showCloseLink !== false,
    value,
  } : null
})

export default _.curryRight(alert)
