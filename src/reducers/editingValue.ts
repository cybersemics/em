import _ from 'lodash'
import State from '../@types/State'

/** Sets the value that is being edited (unthrottled). */
const editingValue = (state: State, { value }: { value: string }) => ({
  ...state,
  editingValue: value,
})

export default _.curryRight(editingValue)
