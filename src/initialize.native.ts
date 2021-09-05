import { importText } from './action-creators'
import { EM_TOKEN, INITIAL_SETTINGS } from './constants'
import { store } from './store'
import { never } from './util'

/**
 * Initialize settings.
 */
export const initialize = () => {
  store.dispatch(
    importText({
      path: [EM_TOKEN],
      text: INITIAL_SETTINGS,
      lastUpdated: never(),
      preventSetCursor: true,
    }),
  )
}
