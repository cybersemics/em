/**
 * @packageDocumentation
 * @module action-creators.updateSplitPosition
 */

/** Updates the position of the Split View splitter. */
const updateSplitPosition = splitPosition => dispatch => {
  localStorage.setItem('splitPosition', parseInt(splitPosition, 10))

  dispatch({
    type: 'updateSplitPosition',
    value: splitPosition
  })
}

export default updateSplitPosition
