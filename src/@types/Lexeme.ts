import ThoughtId from './ThoughtId'
import Timestamp from './Timestamp'

/** An object that contains a list of contexts where a lexeme appears in different word forms (plural, different cases, emojis, etc). All word forms hash to a given lexeme. */
interface Lexeme {
  // db only; not the same as keyof lexemeIndex
  id?: string
  // normalized value
  lemma: string
  contexts: ThoughtId[]
  created: Timestamp
  lastUpdated: Timestamp
  updatedBy?: string
}

export default Lexeme
