import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import composeReducers from '../util/reducerFlow'
import runDocumentCommand from './runDocumentCommand'

/** Composes test commands, restoring the fixture only when opening the outer document transaction. */
const reducerFlow = (reducers: Parameters<typeof composeReducers<State>>[0]) => {
  const command = composeReducers(reducers)
  return Object.assign(
    (state: State, transaction?: ThoughtspaceTransaction): State =>
      transaction ? command(state, transaction) : runDocumentCommand(command, state),
    { requiresDocument: true as const },
  )
}

export default reducerFlow
