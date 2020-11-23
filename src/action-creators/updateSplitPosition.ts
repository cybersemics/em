import { ActionCreator } from '../types'

/** Updates the position of the Split View splitter. */
const updateSplitPosition = (splitPosition: number): ActionCreator => dispatch => {
  localStorage.setItem('splitPosition', splitPosition.toString())

  dispatch({
    type: 'updateSplitPosition',
    value: splitPosition
  })
}

export default updateSplitPosition
