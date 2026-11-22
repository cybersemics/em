import Index from './IndexType'
import Lexeme from './Lexeme'
import Thought from './Thought'

interface ThoughtIndices {
  thoughtIndex: Index<Thought>
  lexemeIndex: Index<Lexeme>
  /** How far storage had got when it read thoughtIndex, if known. See data-providers/treecrdt/readFreshness. */
  headSeq?: number
  /** How far the Lexeme index had got when it read lexemeIndex, if known. */
  lexemeHeadSeq?: number
}

export default ThoughtIndices
