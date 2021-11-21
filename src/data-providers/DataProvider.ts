import { Index, Lexeme, Parent, ThoughtId } from '../@types'

/** A standard interface for data providers that can sync thoughts. See data-providers/README.md. */
export interface DataProvider {
  clearAll: () => Promise<unknown>
  getThoughtById: (id: string) => Promise<Lexeme | undefined>
  getThoughtsByIds: (ids: string[]) => Promise<(Lexeme | undefined)[]>
  getContextById: (id: ThoughtId) => Promise<Parent | undefined>
  getContextsByIds: (ids: ThoughtId[]) => Promise<(Parent | undefined)[]>
  updateThought: (id: string, thought: Lexeme) => Promise<unknown>
  updateContext: (id: ThoughtId, Parent: Parent) => Promise<unknown>
  updateContextIndex: (contextIndex: Index<Parent>) => Promise<unknown>
  updateThoughtIndex: (thoughtIndex: Index<Lexeme>) => Promise<unknown>
}
