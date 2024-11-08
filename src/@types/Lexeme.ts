import ThoughtId from './ThoughtId'
import Timestamp from './Timestamp'

/** An object that contains a list of contexts where a lexeme appears in different word forms (plural, different cases, emojis, etc). All word forms hash to a given lexeme. */
interface Lexeme {
  contexts: ThoughtId[]
  created: Timestamp
  lastUpdated: Timestamp
  /** The public key of the user defined by a hash of their private access token. See: clientId (yjs/index.ts). */
  updatedBy: string
}

export default Lexeme
