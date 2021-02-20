import { State } from '../util/initialState'
import { ABSOLUTE_TOKEN, HOME_TOKEN, TRANSIENT_ABSOLUTE_CHILD_PATH } from '../constants'
import { isHome, timestamp } from '../util'

/** Toggles starting context. */
const toggleAbsoluteContext = (state: State): State => ({
  ...state,
  rootContext: isHome(state.rootContext) ? [ABSOLUTE_TOKEN] : [HOME_TOKEN],
  cursorBeforeQuickAdd: state.cursor,
  absoluteContextTime: timestamp(),
  cursor: isHome(state.rootContext) ? TRANSIENT_ABSOLUTE_CHILD_PATH : state.cursorBeforeQuickAdd,
})

export default toggleAbsoluteContext
