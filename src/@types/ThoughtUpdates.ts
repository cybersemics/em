import Index from './IndexType'
import Lexeme from './Lexeme'
import Thought from './Thought'

interface ThoughtUpdates {
  thoughtIndex: Index<Thought | null>
  lexemeIndex: Index<Lexeme | null>
}

export default ThoughtUpdates
