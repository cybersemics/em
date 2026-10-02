import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Sets the untrimmed value that the cursor thought's editable renders after a paste. See State.untrimmedCursorValue. */
const untrimmedCursorValue = (state: State, { value }: { value: string | null }): State => ({
  ...state,
  untrimmedCursorValue: value,
})

/** Action-creator for untrimmedCursorValue. NOOP if the value is unchanged. */
export const untrimmedCursorValueActionCreator =
  (payload: Parameters<typeof untrimmedCursorValue>[1]): Thunk =>
  (dispatch, getState) => {
    if (getState().untrimmedCursorValue !== payload.value) {
      dispatch({ type: 'untrimmedCursorValue', ...payload })
    }
  }

export default _.curryRight(untrimmedCursorValue)

// Register this action's metadata
registerActionMetadata('untrimmedCursorValue', {
  undoable: false,
})
