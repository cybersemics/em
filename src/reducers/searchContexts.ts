import Index from '../@types/IndexType'
import Context from '../@types/Context'
import State from '../@types/State'

/** Set search contexts map that needs to be picked up by pull queue middleware. */
const searchContexts = (state: State, { value }: { value: Index<Context> | null }): State => ({
  ...state,
  searchContexts: value,
})

export default searchContexts
