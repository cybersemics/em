import type Thought from './Thought'

/** Persisted fields intentionally written by a local edit. Creating a thought requires all non-optional fields. */
type ThoughtPatch = Partial<
  Pick<Thought, 'value' | 'created' | 'lastUpdated' | 'updatedBy' | 'archived' | 'parentId' | 'rank'>
> &
  Pick<Thought, 'id'>

export default ThoughtPatch
