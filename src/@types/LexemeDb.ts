import _ from 'lodash'
import keyValueBy from '../util/keyValueBy'
import Index from './IndexType'
import Lexeme from './Lexeme'
import ThoughtId from './ThoughtId'

/** A Lexeme database type that defines contexts as an object to allow individual updates. */
type LexemeDb = Omit<Lexeme, 'contexts'> & {
  // number is from the new schema that encodes the order of the contexts
  // boolean is from the old schema. It should be ignored unless the Lexeme contexts are rewritten.
  contexts?: Index<number | boolean>
}

/** Converts a Lexeme to a LexemeDb. */
export const toLexemeDb = (lexeme: Lexeme): LexemeDb =>
  ({
    ..._.omit(lexeme, 'contexts'),
    // store array order in object as 1-based index
    contexts: keyValueBy(lexeme.contexts, (id, i) => ({ [id]: i + 1 })),
  } as LexemeDb)

/** Converts a LexemeDb to a Lexeme. */
export const fromLexemeDb = (lexemeDb?: LexemeDb): Lexeme | undefined => {
  if (!lexemeDb) return undefined
  // reconstruct the order of the Lexeme contexts array
  const contexts = _.sortBy(Object.entries(lexemeDb.contexts || {}), 1).map(([id, index]) => id as ThoughtId)
  return {
    ...lexemeDb,
    contexts,
  }
}

export default LexemeDb
