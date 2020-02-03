import * as Actions from '../actions/ActionTypes'

const ThoughtReducer = (state = { thoughtList: [{}], recentlyEdited: [] }, action) => {
  switch (action.type) {
    case Actions.ADD_THOUGHT:
      return {
        ...state,
        thoughtList: action.data,
      }
    case Actions.RECENTLY_EDITED_THOUGHTS:
      return {
        ...state,
        recentlyEdited: action.data,
      }
    default:
      
      return state;
  }
};
export default ThoughtReducer;
