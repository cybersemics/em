import { Index } from './IndexType'
import { Thought } from './Thought'
import { Lexeme } from './Lexeme'

export interface ThoughtUpdates {
  thoughtIndex: Index<Thought | null>
  lexemeIndex: Index<Lexeme | null>
}
