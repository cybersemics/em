import { Thunk } from '../types'

/** Updates the position of the Split View splitter. */
const updateSplitPosition = (splitPosition: number): Thunk => dispatch => {
  localStorage.setItem('splitPosition', splitPosition.toString())

  dispatch({
    type: 'updateSplitPosition',
    value: splitPosition
  })
}

export default updateSplitPosition
