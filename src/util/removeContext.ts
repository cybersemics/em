import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Timestamp from '../@types/Timestamp'
import { clientId } from '../data-providers/yjs'
import timestamp from './timestamp'

/** Returns a shallow copy of an object with all keys that do not have a value of null. */
const nonNullValues = <T>(o: Index<T>) =>
  Object.keys(o).reduce((acc, key) => (o[key] !== null ? { ...acc, [key]: o[key] } : acc), {} as Index<T>)

/** Returns a new Lexeme without the given context. */
const removeContext = (lexeme: Lexeme, thoughtId: string, lastUpdated: Timestamp = timestamp()): Lexeme => ({
  ...lexeme,
  ...nonNullValues({
    contexts: lexeme.contexts ? lexeme.contexts.filter(id => id !== thoughtId) : [],
    created: lexeme.created || lastUpdated,
    lastUpdated: lastUpdated,
    updatedBy: clientId,
  }),
})

export default removeContext
