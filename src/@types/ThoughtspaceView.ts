import Index from './IndexType'
import Lexeme from './Lexeme'
import Thought from './Thought'
import ThoughtId from './ThoughtId'

/** An immutable document reader with EM-derived lexemes and sparse editor overlays. */
interface ThoughtspaceView {
  getThought: (id: ThoughtId) => Thought | undefined
  /** Payload-bearing children in canonical order. */
  getChildren: (id: ThoughtId) => readonly ThoughtId[]
  /** Position in the raw sibling order, including payload-less nodes. */
  getPosition: (id: ThoughtId) => number | undefined
  values: () => IterableIterator<Thought>
  readonly lexemeIndex: Index<Lexeme>
  readonly overlays: Index<Pick<Thought, 'generating' | 'displayValue' | 'splitSource'>>
  /** Changes only editor fields; document fields remain owned by the snapshot. */
  withOverlays: (updates: Index<Thought | null>) => ThoughtspaceView
}

export default ThoughtspaceView
