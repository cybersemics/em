import { Index, Context, State } from '../@types'

/** Set search contexts map that needs to be picked up by pull queue middleware. */
const searchContexts = (state: State, { value }: { value: Index<Context> | null }): State => ({
  ...state,
  searchContexts: value,
})

export default searchContexts
