import Path from '../@types/Path'
import State from '../@types/State'
import hashPath from '../util/hashPath'

/** Return true if the given path is part of a multicursor selection.  */
const isMulticursorPath = (state: State, path: Path) => !!state.multicursors[hashPath(path)]

export default isMulticursorPath
