import * as Actions from './ActionTypes';

export const addNewThought = (thought) => {
  return dispatch => {
    dispatch(addThought(thought))
  }
}

export const addThought = (data) => ({
  type: Actions.ADD_THOUGHT,
  data: data
})

