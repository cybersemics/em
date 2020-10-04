import { Lexeme, Parent } from '../types'
import { GenericObject } from '../utilTypes'

/** A standard interface for data providers that can sync thoughts. See data-providers/README.md. */
export interface DataProvider {
  clearAll: () => Promise<unknown>,
  getThoughtById: (id: string) => Promise<Lexeme | undefined>,
  getThoughtsByIds: (ids: string[]) => Promise<(Lexeme | undefined)[]>,
  getContextById: (id: string) => Promise<Parent | undefined>,
  getContextsByIds: (ids: string[]) => Promise<(Parent | undefined)[]>,
  updateThought: (id: string, thought: Lexeme) => Promise<unknown>,
  updateContext: (id: string, Parent: Parent) => Promise<unknown>,
  updateContextIndex: (contextIndex: GenericObject<Parent>) => Promise<unknown>,
  updateThoughtIndex: (thoughtIndex: GenericObject<Lexeme>) => Promise<unknown>,
}
