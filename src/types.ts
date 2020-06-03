declare global {
  interface Window {
      firebase:any;
  }
}

/** An entry in thoughtIndex[].contexts. */
interface ThoughtContext {
  context: Context,
  rank: number,
  lastUpdated?: string
}

/** An object that contains a list of contexts where a lexeme appears in different word forms (plural, different cases, emojis, etc). All word forms hash to a given lexeme. */
export interface Lexeme {
  rank?: number,
  value: string,
  contexts: Array<ThoughtContext>,
  created?: string,
  lastUpdated?: string
}

/** A thought with a specific rank. */
export interface Child {
  rank: number,
  value: string,
  lastUpdated?: string
}

/** A sequence of children with ranks. */
export type Path = Array<Child>

/** A sequence of values. */
export type Context = Array<string>
