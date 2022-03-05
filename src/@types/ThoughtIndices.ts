import { Index } from './IndexType'
import { Thought } from './Thought'
import { Lexeme } from './Lexeme'

export interface ThoughtIndices {
  thoughtIndex: Index<Thought>
  lexemeIndex: Index<Lexeme>
}
