import { Index } from './IndexType'
import { Parent } from './Parent'
import { Lexeme } from './Lexeme'

export interface ThoughtUpdates {
  contextIndex: Index<Parent | null>
  thoughtIndex: Index<Lexeme | null>
}
