import _ from 'lodash'
import State from '../@types/State'

/** Sets the search. If not null, will open the search screen. */
const search = (state: State, { value, archived }: { value: string | null; archived?: boolean }) => ({
  ...state,
  search: value,
  archived,
})

export default _.curryRight(search)
