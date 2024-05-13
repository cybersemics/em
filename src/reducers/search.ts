import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Sets the search. If not null, will open the search screen. */
const search = (state: State, { value, archived }: { value: string | null; archived?: boolean }) => ({
  ...state,
  search: value,
  archived,
})

/** Action-creator for search. */
export const searchActionCreator =
  (payload: Parameters<typeof search>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'search', ...payload })

export default _.curryRight(search)
