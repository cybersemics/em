import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Ends a multicursor transaction. */
const endMulticursorTransaction = (state: State): State => ({
  ...state,
  isMulticursorTransaction: false,
})

/** Action-creator for endMulticursorTransaction. */
export const endMulticursorTransactionActionCreator = (): Thunk => dispatch =>
  dispatch({ type: 'endMulticursorTransaction' })

export default endMulticursorTransaction
