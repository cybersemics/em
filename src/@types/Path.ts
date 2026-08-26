import PathStep from './PathStep'

/** A sequence of steps from the root to a rendered thought. May cross context views, in which case the crossing steps are ContextSteps. */
type Path = [PathStep, ...PathStep[]]

export default Path
