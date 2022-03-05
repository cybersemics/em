import { Index } from './IndexType'
import { Thought } from './Thought'
import { Lexeme } from './Lexeme'

export interface ThoughtUpdates {
  contextIndex: Index<Thought | null>
  lexemeIndex: Index<Lexeme | null>
}
