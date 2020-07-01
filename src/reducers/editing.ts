import { State } from '../util/initialState'

/** Track editing independently of cursor to allow navigation when keyboard is hidden. */
const editing = (state: State, { value }: { value: string }) => ({
  ...state,
  editing: value
})

export default editing
