import { ThoughtContext } from './ThoughtContext'
import { Timestamp } from './Timestamp'

/** An object that contains a list of contexts where a lexeme appears in different word forms (plural, different cases, emojis, etc). All word forms hash to a given lexeme. */
export interface Lexeme {
  id?: string // db only; not the same as Child id
  value: string
  contexts: ThoughtContext[]
  created: Timestamp
  lastUpdated: Timestamp
}
