import _ from 'lodash'
import { State } from '../@types'

/** Track editing independently of cursor to allow navigation when keyboard is hidden. */
const editing = (state: State, { value }: { value: boolean }) => ({
  ...state,
  editing: value,
})

export default _.curryRight(editing)
