const ThoughtReducer = (state = { thoughtsList: [{}] }, { type, data }) => {
  state.thoughtsList = [{}]
  if (data != undefined) {
    return {...state, thoughtsList : data}
  }
  return state
};

export default ThoughtReducer