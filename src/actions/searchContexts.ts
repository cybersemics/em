import Context from '../@types/Context'
import Index from '../@types/IndexType'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Set search contexts map that needs to be picked up by pull queue middleware. */
const searchContexts = (state: State, { value }: { value: Index<Context> | null }): State => ({
  ...state,
  searchContexts: value,
})

/** Action-creator for searchContexts. */
export const searchContextsActionCreator =
  (payload: Parameters<typeof searchContexts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'searchContexts', ...payload })

export default searchContexts
