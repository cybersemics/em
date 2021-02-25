import { State } from '../util/initialState'
import { ABSOLUTE_TOKEN, HOME_TOKEN } from '../constants'
import { isHome, timestamp } from '../util'

/** Toggles starting context. */
const toggleAbsoluteContext = (state: State): State => ({
  ...state,
  rootContext: isHome(state.rootContext) ? [ABSOLUTE_TOKEN] : [HOME_TOKEN],
  cursorBeforeQuickAdd: state.cursor,
  absoluteContextTime: timestamp(),
  cursor: isHome(state.rootContext) ? [{ value: '', rank: 0 }] : state.cursorBeforeQuickAdd,
})

export default toggleAbsoluteContext
