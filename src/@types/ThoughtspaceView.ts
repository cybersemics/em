import Index from './IndexType'
import Lexeme from './Lexeme'
import Thought from './Thought'
import ThoughtId from './ThoughtId'

/** An immutable document reader with EM-derived lexemes. */
interface ThoughtspaceView {
  getThought: (id: ThoughtId) => Thought | undefined
  /** Payload-bearing children in canonical order. */
  getChildren: (id: ThoughtId) => readonly ThoughtId[]
  /** Position in the raw sibling order, including payload-less nodes. */
  getPosition: (id: ThoughtId) => number | undefined
  values: () => IterableIterator<Thought>
  readonly lexemeIndex: Index<Lexeme>
}

export default ThoughtspaceView
