import { State } from '../util/initialState'
import { Index, Context } from '../types'

/** Set search contexts map that needs to be picked up by pull queue middleware. */
const searchContexts = (state: State, { value }: { value: (Index<Context> | null) }): State => ({ ...state, searchContexts: value })

export default searchContexts
