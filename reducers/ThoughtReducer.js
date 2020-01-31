import * as Actions from '../actions/ActionTypes'

const ThoughtReducer = (state = { thoughtList: [{}] }, action) => {
  switch (action.type) {
    case Actions.ADD_THOUGHT:
      return {
        ...state,
        thoughtList: action.data,
      }
    default:
      return state;
  }
};
export default ThoughtReducer;
