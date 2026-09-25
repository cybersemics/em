import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import newThought, { NewThoughtPayload } from '../actions/newThought'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'

/** Alias for newThought with insertNewSubthought: true. */
const newSubthought = (state: State, payload: NewThoughtPayload | string, document?: ThoughtspaceTransaction) => {
  // optionally allow string value to be passed as entire payload
  if (typeof payload === 'string') {
    payload = { value: payload }
  }

  return newThought(state, { ...payload, insertNewSubthought: true }, document)
}

/** Action-creator for newSubthought. */
export const newSubthoughtActionCreator = (): Thunk => dispatch => dispatch({ type: 'newSubthought' })

export default command(newSubthought)

// Register this action's metadata
registerActionMetadata('newSubthought', {
  undoable: true,
})
