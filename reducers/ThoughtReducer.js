const ThoughtReducer = (state = { thoughtList: [{}] }, { type, data }) => {
  state.thoughtList = [{}]
  if (data != undefined) {
    return {...state, thoughtList : data}
  }
  return state
};

export default ThoughtReducer
