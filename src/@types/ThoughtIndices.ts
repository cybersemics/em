import { Index } from './IndexType'
import { Parent } from './Parent'
import { Lexeme } from './Lexeme'

export interface ThoughtIndices {
  contextIndex: Index<Parent>
  thoughtIndex: Index<Lexeme>
}
