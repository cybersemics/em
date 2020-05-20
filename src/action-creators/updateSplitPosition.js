/** Updates the position of the Split View splitter. */
export default splitPosition => dispatch => {
  localStorage.setItem('splitPosition', parseInt(splitPosition, 10))

  dispatch({
    type: 'updateSplitPosition',
    value: splitPosition
  })
}
