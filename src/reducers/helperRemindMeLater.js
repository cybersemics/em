import { isMobile } from '../browser.js'
import { restoreSelection, helperCleanup } from '../util'

export const helperRemindMeLater = (state) => ({ id, duration=0 }) => {

  if (state.cursor && (state.editing || !isMobile)) {
    setTimeout(() => {
      restoreSelection(state.cursor)
    }, 0)
  }

  const time = Date.now() + duration
  localStorage['helper-hideuntil-' + id] = time

  helperCleanup()

  return {
    showHelper: null,
    helpers: Object.assign({}, state.helpers, {
      [id]: Object.assign({}, state.helpers[id], {
        hideuntil: time
      })
    })
  }
}