import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storage from '../util/storage'

/** Updates the position of the Split View splitter. */
const updateSplitPosition = (state: State, { value }: { value: number }) => ({
  ...state,
  splitPosition: value,
})

// debounced local storage persistence
const save = _.debounce((splitPosition: number) => {
  storage.setItem('splitPosition', splitPosition.toString())
}, 400)

/** Updates the position of the Split View splitter. */
export const updateSplitPositionActionCreator = (splitPosition: number): Thunk => {
  save(splitPosition)
  return dispatch => {
    dispatch({
      type: 'updateSplitPosition',
      value: splitPosition,
    })
  }
}

export default _.curryRight(updateSplitPosition)
