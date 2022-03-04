import { Index } from './IndexType'
import { Thought } from './Thought'
import { Lexeme } from './Lexeme'

export interface ThoughtIndices {
  contextIndex: Index<Thought>
  thoughtIndex: Index<Lexeme>
}
