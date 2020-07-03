import { State } from '../util/initialState'

interface Options {
  value: string | null,
  showCloseLink?: boolean,
  alertType?: string,
}

/** Set an alert with an optional close link. */
const alert = (state: State, { value, showCloseLink, alertType }: Options) => ({
  ...state,
  alert: value ? { value, showCloseLink, alertType } : null
})

export default alert
