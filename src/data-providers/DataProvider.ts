import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'

/** Thoughts in the order one read returned them. `headSeq` is how far storage had got when it read them, if known. */
export type ThoughtsRead = (Thought | undefined)[] & { headSeq?: number }

/** Lexemes in the order one read returned them. `headSeq` is how far the Lexeme index had got, if known. */
export type LexemesRead = (Lexeme | undefined)[] & { headSeq?: number }

/** A standard interface for data providers that can sync thoughts. */
export interface DataProvider {
  name?: string
  clear: () => Promise<unknown>
  getLexemeById: (key: string) => Promise<Lexeme | undefined>
  getLexemesByIds: (keys: string[]) => Promise<LexemesRead>
  getThoughtById: (id: ThoughtId) => Promise<Thought | undefined>
  getThoughtsByIds: (ids: ThoughtId[]) => Promise<ThoughtsRead>
  /** Resolved value is provider-specific; the treecrdt provider returns `readonly Operation[]` for local tree mutations. */
  updateThoughts: (args: {
    thoughtIndexUpdates: Index<Thought | null>
    movePlacements?: Index<ThoughtId | null>
    /** Explicit Favorites ordering preference, independent of derived membership. */
    favoriteOrder?: ThoughtId[]
  }) => Promise<unknown>
  freeThought: (id: ThoughtId) => Promise<void>
  freeLexeme: (key: string) => Promise<void>
}
