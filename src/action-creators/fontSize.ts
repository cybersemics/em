import Thunk from '../@types/Thunk'
import storageModel from '../stores/storageModel'

/** Sets fontSize in state and localStorage. */
const fontSize =
  (n: number): Thunk =>
  (dispatch, getState) => {
    dispatch({ type: 'fontSize', value: n })
    setTimeout(() => {
      storageModel.set('fontSize', n)
    })
  }

export default fontSize
