import { ABSOLUTE_TOKEN, HOME_TOKEN } from '../constants'
import { State } from '../@types'
import { isHome, timestamp } from '../util'

/** Toggles starting context. */
const toggleAbsoluteContext = (state: State): State => ({
  ...state,
  rootContext: isHome(state.rootContext) ? [ABSOLUTE_TOKEN] : [HOME_TOKEN],
  cursorBeforeQuickAdd: state.cursor,
  absoluteContextTime: timestamp(),
  // @MIGRATION_TODO: What id should be provided for tranisient thought ?
  cursor: isHome(state.rootContext) ? ['TRANSIENT_THOUGHT'] : state.cursorBeforeQuickAdd,
})

export default toggleAbsoluteContext
