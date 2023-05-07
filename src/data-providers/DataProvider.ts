import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Thought from '../@types/Thought'
import ThoughtDb from '../@types/ThoughtDb'
import ThoughtId from '../@types/ThoughtId'

/** A standard interface for data providers that can sync thoughts. See data-providers/README.md. */
export interface DataProvider {
  name?: string
  clear: () => Promise<unknown>
  getLexemeById: (key: string) => Promise<Lexeme | undefined>
  getLexemesByIds: (keys: string[]) => Promise<(Lexeme | undefined)[]>
  getThoughtById: (id: ThoughtId) => Promise<Thought | undefined>
  getThoughtsByIds: (ids: ThoughtId[]) => Promise<(Thought | undefined)[]>
  updateThoughts: (
    thoughtIndexUpdates: Index<ThoughtDb | null>,
    lexemeIndexUpdates: Index<Lexeme | null>,
    schemaVersion: number,
  ) => Promise<unknown>

  /****************************************
   * Used by dataProviderTest only
   ****************************************/
  updateLexeme?: (id: string, thought: Lexeme) => Promise<unknown>
  updateThought?: (id: ThoughtId, thoughtOld: ThoughtDb | undefined, thoughtDb: ThoughtDb) => Promise<unknown>
  updateLexemeIndex?: (lexemeIndex: Index<Lexeme>) => Promise<unknown>
  updateThoughtIndex?: (thoughtIndex: Index<ThoughtDb>) => Promise<unknown>
  freeThought?: (id: ThoughtId) => void
}
