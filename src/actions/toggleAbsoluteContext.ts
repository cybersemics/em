import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { ABSOLUTE_TOKEN, HOME_TOKEN, TRANSIENT_THOUGHT_ID } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import isHome from '../util/isHome'
import timestamp from '../util/timestamp'

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

// Register this action's metadata
registerActionMetadata('toggleAbsoluteContext', {
  undoable: false,
})
