export const render = (state) => () => ({
  dataNonce: state.dataNonce + 1
})