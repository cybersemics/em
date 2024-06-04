import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'

/** A standard interface for data providers that can sync thoughts. See data-providers/README.md. */
export interface DataProvider<T extends any[] = any> {
  name?: string
  clear: () => Promise<unknown>
  init?: (...args: T) => void
  getLexemeById: (key: string) => Promise<Lexeme | undefined>
  getLexemesByIds: (keys: string[]) => Promise<(Lexeme | undefined)[]>
  getThoughtById: (id: ThoughtId) => Promise<Thought | undefined>
  getThoughtsByIds: (ids: ThoughtId[]) => Promise<(Thought | undefined)[]>
  updateThoughts: (args: {
    thoughtIndexUpdates: Index<Thought | null>
    lexemeIndexUpdates: Index<Lexeme | null>
    lexemeIndexUpdatesOld: Index<Lexeme | undefined>
    schemaVersion: number
  }) => Promise<unknown>
  freeLexeme: (key: string) => Promise<void>

  /****************************************
   * Used by dataProviderTest only
   ****************************************/
  updateLexeme?: (id: string, thought: Lexeme) => Promise<unknown>
  updateThought?: (id: ThoughtId, thoughtOld: Thought | undefined, thoughtDb: Thought) => Promise<unknown>
  updateLexemeIndex?: (lexemeIndex: Index<Lexeme>) => Promise<unknown>
  updateThoughtIndex?: (thoughtIndex: Index<Thought>) => Promise<unknown>
}
