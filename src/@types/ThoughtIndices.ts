import Index from './IndexType'
import Thought from './Thought'
import Lexeme from './Lexeme'

interface ThoughtIndices {
  thoughtIndex: Index<Thought>
  lexemeIndex: Index<Lexeme>
}

export default ThoughtIndices
