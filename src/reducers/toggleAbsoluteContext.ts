import { ABSOLUTE_TOKEN, HOME_TOKEN } from '../constants'
import { State, ThoughtId } from '../@types'
import { isHome, timestamp } from '../util'

const TRANSIENT_THOUGHT_ID = 'TRANSIENT_THOUGHT' as ThoughtId

/** Toggles starting context. */
const toggleAbsoluteContext = (state: State): State => ({
  ...state,
  rootContext: isHome(state.rootContext) ? [ABSOLUTE_TOKEN] : [HOME_TOKEN],
  cursorBeforeQuickAdd: state.cursor,
  absoluteContextTime: timestamp(),
  // @MIGRATION_TODO: What id should be provided for tranisient thought ?
  cursor: isHome(state.rootContext) ? [TRANSIENT_THOUGHT_ID] : state.cursorBeforeQuickAdd,
})

export default toggleAbsoluteContext
