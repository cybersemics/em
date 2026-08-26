import Path from '../@types/Path'
import State from '../@types/State'
import pathToThought from '../selectors/pathToThought'

/** Returns the value displayed at the head of a Path. In the context view this is the context's value, i.e. what the user sees on the row. */
const headValue = (state: State, path: Path): string | undefined => pathToThought(state, path)?.value

export default headValue
