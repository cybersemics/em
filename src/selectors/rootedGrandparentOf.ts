import Context from '../@types/Context'
import Path from '../@types/Path'
import State from '../@types/State'
import rootedParentOf from './rootedParentOf'

/**
 * Calls rootedParentOf twice to get the rooted grandparent of a thought.
 * A thought's grandparent is relevant when it is column 2 in a table, since its grandparent will be the table itself.
 * The only reason why we currently need to know when a thought is in column 2 of a table is in order to apply
 * a different indent level to it, since the app will scroll over to it when selected even though indentDepth
 * in LayoutTree does not change.
 * */
const rootedGrandparentOf = <T extends Context | Path>(state: State, thoughts: T): T =>
  rootedParentOf(state, rootedParentOf(state, thoughts))

export default rootedGrandparentOf
