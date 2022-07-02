import Index from './IndexType'
import Lexeme from './Lexeme'
import Thought from './Thought'

interface ThoughtIndices {
  thoughtIndex: Index<Thought>
  lexemeIndex: Index<Lexeme>
}

export default ThoughtIndices
