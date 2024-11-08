import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { ABSOLUTE_TOKEN, HOME_TOKEN } from '../constants'
import isHome from '../util/isHome'
import timestamp from '../util/timestamp'

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

/** Action-creator for toggleAbsoluteContext. */
export const toggleAbsoluteContextActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleAbsoluteContext' })

export default toggleAbsoluteContext
