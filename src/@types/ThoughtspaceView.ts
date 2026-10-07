import Index from './IndexType'
import Lexeme from './Lexeme'
import Thought from './Thought'
import ThoughtId from './ThoughtId'

/** Current document reads with EM-derived lexemes. Retain returned values, not this reader, for earlier state. */
interface ThoughtspaceView {
  /** Changes when current reads change; a cache invalidation token, not a historical read handle. */
  readonly revision: number
  getThought: (id: ThoughtId) => Thought | undefined
  /** Payload-bearing children in canonical order. */
  getChildren: (id: ThoughtId) => readonly ThoughtId[]
  /** Position in the raw sibling order, including payload-less nodes. */
  getPosition: (id: ThoughtId) => number | undefined
  values: () => IterableIterator<Thought>
  readonly lexemeIndex: Index<Lexeme>
}

export default ThoughtspaceView
