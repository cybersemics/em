import Index from './IndexType'
import Thought from './Thought'
import Lexeme from './Lexeme'

interface ThoughtUpdates {
  thoughtIndex: Index<Thought | null>
  lexemeIndex: Index<Lexeme | null>
}

export default ThoughtUpdates
