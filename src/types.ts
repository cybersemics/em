declare global {
  interface Window {
      firebase:any;
  }
}

/** A timestamp string. */
export type Timestamp = string

/** An entry in thoughtIndex[].contexts. */
interface ThoughtContext {
  context: Context,
  rank: number,
  lastUpdated?: Timestamp
}

/** An object that contains a list of contexts where a lexeme appears in different word forms (plural, different cases, emojis, etc). All word forms hash to a given lexeme. */
export interface Lexeme {
  rank: number,
  value: string,
  contexts: Array<ThoughtContext>,
  created: Timestamp,
  lastUpdated: Timestamp
}

/** A parent with a list of children. */
export interface Parent {
  children: Array<Child>,
  lastUpdated: Timestamp,
}

/** A thought with a specific rank. */
export interface Child {
  rank: number,
  value: string,
  lastUpdated?: Timestamp
}

/** A sequence of children with ranks. */
export type Path = Array<Child>

/** A sequence of values. */
export type Context = Array<string>

/** An object that contains a list of children within a context. */
export interface ParentEntry {
  children: Array<Child>,
  lastUpdated: Timestamp,
}
