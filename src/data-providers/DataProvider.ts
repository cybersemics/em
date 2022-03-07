import { Index, Lexeme, Thought, ThoughtId } from '../@types'

/** A standard interface for data providers that can sync thoughts. See data-providers/README.md. */
export interface DataProvider {
  clearAll: () => Promise<unknown>
  getLexemeById: (id: string) => Promise<Lexeme | undefined>
  getLexemesByIds: (ids: string[]) => Promise<(Lexeme | undefined)[]>
  getThoughtById: (id: ThoughtId) => Promise<Thought | undefined>
  getThoughtsByIds: (ids: ThoughtId[]) => Promise<(Thought | undefined)[]>
  updateLexeme: (id: string, thought: Lexeme) => Promise<unknown>
  updateThought: (id: ThoughtId, Parent: Thought) => Promise<unknown>
  updateLexemeIndex: (lexemeIndex: Index<Lexeme>) => Promise<unknown>
  updateThoughtIndex: (thoughtIndex: Index<Thought>) => Promise<unknown>
}
