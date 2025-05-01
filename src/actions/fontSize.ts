import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Sets the font size. */
const fontSize = (state: State, { value }: { value: number }) => ({
  ...state,
  fontSize: value,
})

/** Sets fontSize in state and localStorage. */
export const fontSizeActionCreator =
  (n: number): Thunk =>
  dispatch => {
    dispatch({ type: 'fontSize', value: n })
    setTimeout(() => {
      storageModel.set('fontSize', n)
    })
  }

export default _.curryRight(fontSize)

// Register this action's metadata
registerActionMetadata('fontSize', {
  undoable: false,
})
