export const addNewThought = (data) => (dispatch) => {
    return dispatch({
        type: 'ADD_THOUGHT',
        data: data
    })
}