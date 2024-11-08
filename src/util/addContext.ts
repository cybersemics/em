import Lexeme from '../@types/Lexeme'
import ThoughtId from '../@types/ThoughtId'
import Timestamp from '../@types/Timestamp'
import { clientId } from '../data-providers/yjs'
import timestamp from './timestamp'

/** Returns a new thought plus the given context. Does not add duplicates. */
const addContext = (
  lexeme: Lexeme,
  {
    archived,
    id,
    lastUpdated,
  }: {
    archived?: Timestamp
    lastUpdated?: Timestamp
    // the thought to add to lexeme.contexts
    id: ThoughtId
  },
): Lexeme => ({
  ...lexeme,
  contexts: [...(lexeme.contexts || []).filter(cxid => !(id === cxid)), id],
  lastUpdated: timestamp(),
  updatedBy: clientId,
})

export default addContext
