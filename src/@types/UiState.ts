import State from './State'

/** State owned by Redux; canonical thoughts are read from the data provider. */
type UiState = Omit<State, 'thoughts'>

export default UiState
