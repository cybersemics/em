import { ABSOLUTE_TOKEN, HOME_TOKEN } from '../constants'
import { State } from '../@types'
import { hashContext, isHome, timestamp } from '../util'

/** Toggles starting context. */
const toggleAbsoluteContext = (state: State): State => ({
  ...state,
  rootContext: isHome(state.rootContext) ? [ABSOLUTE_TOKEN] : [HOME_TOKEN],
  cursorBeforeQuickAdd: state.cursor,
  absoluteContextTime: timestamp(),
  cursor: isHome(state.rootContext) ? [{ id: hashContext(['']), value: '', rank: 0 }] : state.cursorBeforeQuickAdd,
})

export default toggleAbsoluteContext
