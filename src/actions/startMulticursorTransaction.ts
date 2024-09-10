import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Starts a multicursor transaction. */
const startMulticursorTransaction = (state: State): State => ({
  ...state,
  isMulticursorTransaction: true,
})

/** Action-creator for startMulticursorTransaction. */
export const startMulticursorTransactionActionCreator = (): Thunk => dispatch =>
  dispatch({ type: 'startMulticursorTransaction' })

export default startMulticursorTransaction
