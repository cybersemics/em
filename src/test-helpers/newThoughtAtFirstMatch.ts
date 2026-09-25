import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import newThought, { NewThoughtPayload } from '../actions/newThought'
import contextToPath from '../selectors/contextToPath'
import command from '../util/command'

/**
 * Creates new thought at the given unranked path first matched.
 */
const newThoughtAtFirstMatch = (
  state: State,
  payload: Omit<NewThoughtPayload, 'at'> & { at: string[] },
  document?: ThoughtspaceTransaction,
): State => {
  const path = contextToPath(state, payload.at)
  if (!path) throw new Error(`Ranked thoughts not found for context: ${payload.at}`)
  return newThought(
    state,
    {
      ...payload,
      at: path,
    },
    document,
  )
}

export default command(newThoughtAtFirstMatch)
