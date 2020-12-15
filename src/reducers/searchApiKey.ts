import { State } from '../util/initialState'

/** Set search api key. */
const searchApiKey = (state: State, { value }: {value: string}) => ({ ...state, searchApiKey: value })

export default searchApiKey
