export const updateSplitPosition = splitPosition => dispatch => {
    dispatch({
        type: 'updateSplitPosition',
        value: splitPosition
    })
}
