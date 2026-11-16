import Path from './Path'
import ThoughtId from './ThoughtId'

/** An unfolded context entry, identified by its source route and destination occurrence. */
type ContextViewExpansion = {
  contextViewPath: Path
  contextId: ThoughtId
  ancestorId: ThoughtId
}

export default ContextViewExpansion
