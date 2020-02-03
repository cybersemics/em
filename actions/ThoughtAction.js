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

export const recentlyEdited = (thought) => {
  return dispatch => {
    dispatch(recentList(thought))
  }
}

export const recentList = (data) => ({
  type: Actions.RECENTLY_EDITED_THOUGHTS,
  data: data
})

