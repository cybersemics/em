import { Index } from './IndexType'
import { Lexeme } from './Lexeme'
import { Parent } from './Parent'

export interface ThoughtIndices {
  contextIndex: Index<Parent>
  thoughtIndex: Index<Lexeme>
}
