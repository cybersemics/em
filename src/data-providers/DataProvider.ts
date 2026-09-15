import type { Operation } from '@treecrdt/interface'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import type ThoughtPatch from '../@types/ThoughtPatch'

/** A standard interface for data providers that can sync thoughts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataProvider<T extends any[] = any> {
  name?: string
  clear: () => Promise<unknown>
  init?: (...args: T) => void
  getLexemeById: (key: string) => Promise<Lexeme | undefined>
  getLexemesByIds: (keys: string[]) => Promise<(Lexeme | undefined)[]>
  getThoughtById: (id: ThoughtId) => Promise<Thought | undefined>
  getThoughtsByIds: (ids: ThoughtId[]) => Promise<(Thought | undefined)[]>
  /** Commits thoughts and returns complete memberships for the affected old and new values, including no-op writes. */
  updateThoughts: (args: {
    thoughtIndexUpdates: Index<ThoughtPatch | null>
    movePlacements?: Index<ThoughtId | null>
    /** Identifies this app write in materialization events. */
    writeId?: string
  }) => Promise<{ operations: readonly Operation[]; lexemeIndex: Index<Lexeme | null> }>
  freeThought: (id: ThoughtId) => Promise<void>
  freeLexeme: (key: string) => Promise<void>

  /****************************************
   * Used by dataProviderTest only
   ****************************************/
  updateLexeme?: (id: string, thought: Lexeme) => Promise<unknown>
  updateThought?: (id: ThoughtId, thoughtOld: Thought | undefined, thoughtDb: Thought) => Promise<unknown>
  updateLexemeIndex?: (lexemeIndex: Index<Lexeme>) => Promise<unknown>
  updateThoughtIndex?: (thoughtIndex: Index<Thought>) => Promise<unknown>
}
