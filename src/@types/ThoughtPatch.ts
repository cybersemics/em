import type Thought from './Thought'

/** Fields intentionally written by a local edit. Creating a missing thought requires a complete Thought. */
type ThoughtPatch = Partial<Thought> & Pick<Thought, 'id'>

export default ThoughtPatch
