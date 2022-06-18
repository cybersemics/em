import Thunk from '../@types/Thunk'
import storage from '../util/storage'

/** Updates the position of the Split View splitter. */
const updateSplitPosition =
  (splitPosition: number): Thunk =>
  dispatch => {
    storage.setItem('splitPosition', splitPosition.toString())

    dispatch({
      type: 'updateSplitPosition',
      value: splitPosition,
    })
  }

export default updateSplitPosition
