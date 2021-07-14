import { Index } from './IndexType'
import { Lexeme } from './Lexeme'
import { Parent } from './Parent'

export interface ThoughtUpdates {
  contextIndex: Index<Parent | null>
  thoughtIndex: Index<Lexeme | null>
}
