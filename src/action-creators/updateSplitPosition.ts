import _ from 'lodash'
import Thunk from '../@types/Thunk'
import storage from '../util/storage'

// debounced local storage persistence
const save = _.debounce((splitPosition: number) => {
  storage.setItem('splitPosition', splitPosition.toString())
}, 400)

/** Updates the position of the Split View splitter. */
const updateSplitPosition = (splitPosition: number): Thunk => {
  save(splitPosition)
  return dispatch => {
    dispatch({
      type: 'updateSplitPosition',
      value: splitPosition,
    })
  }
}

export default updateSplitPosition
