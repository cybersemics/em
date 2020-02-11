const ThoughtReducer = (state = { thoughtsList: [{}] }, { type, data }) => {
  state.thoughtsList = [{}]
  if (data != undefined) {
    return {...state,
      ThoughtReducer}
  }
  return state
};

export default ThoughtReducer