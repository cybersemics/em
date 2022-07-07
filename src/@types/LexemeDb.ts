import _ from 'lodash'
import keyValueBy from '../util/keyValueBy'
import Lexeme from './Lexeme'
import ThoughtId from './ThoughtId'

/** A Lexeme database type that defines contexts as an object to allow individual updates. */
type LexemeDb = Omit<Lexeme, 'contexts'> & { contexts?: Record<ThoughtId, true> }

/** Converts a Lexeme to a LexemeDb. */
export const toLexemeDb = (lexeme: Lexeme): LexemeDb =>
  ({
    ..._.omit(lexeme, 'contexts'),
    contexts: keyValueBy(lexeme.contexts, id => ({ [id]: true })),
  } as LexemeDb)

/** Converts a LexemeDb to a Lexeme. */
export const fromLexemeDb = (lexemeDb?: LexemeDb): Lexeme | undefined =>
  lexemeDb
    ? {
        ...lexemeDb,
        contexts: Object.keys(lexemeDb.contexts || {}) as ThoughtId[],
      }
    : undefined

export default LexemeDb
