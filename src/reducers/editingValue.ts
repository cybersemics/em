import { State } from '../util/initialState'

/** Sets the value that is being edited (unthrottled). */
const editingValue = (state: State, { value }: { value: string }) => ({
  ...state,
  editingValue: value
})

export default editingValue
