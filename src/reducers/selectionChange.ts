import _ from 'lodash'
import { State } from '../util/initialState'

/** Sets the focusOffset when the cursor selection is changed. */
const selectionChange = (state: State, { focusOffset }: { focusOffset?: number }) => ({
  ...state,
  focusOffset
})

export default _.curryRight(selectionChange)
