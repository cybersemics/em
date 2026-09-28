import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'

/** A standard interface for data providers that can sync thoughts. */
export interface DataProvider {
  name?: string
  clear: () => Promise<unknown>
  getLexemeById: (key: string) => Promise<Lexeme | undefined>
  getLexemesByIds: (keys: string[]) => Promise<(Lexeme | undefined)[]>
  getThoughtById: (id: ThoughtId) => Promise<Thought | undefined>
  getThoughtsByIds: (ids: ThoughtId[]) => Promise<(Thought | undefined)[]>
  /** Resolved value is provider-specific; the treecrdt provider returns `readonly Operation[]` for local tree mutations. */
  updateThoughts: (args: {
    thoughtIndexUpdates: Index<Thought | null>
    lexemeIndexUpdates: Index<Lexeme | null>
    movePlacements?: Index<ThoughtId | null>
  }) => Promise<unknown>
  freeThought: (id: ThoughtId) => Promise<void>
  freeLexeme: (key: string) => Promise<void>
}
