import _ from 'lodash'
import { State } from '../util/initialState'

/** */
const restoreSelection = (state: State, { value, offset }: { value: boolean, offset?: number }) => ({
  ...state,
  restoreSelection: value,
  cursorOffset: offset || state.cursorOffset
})

export default _.curryRight(restoreSelection)
