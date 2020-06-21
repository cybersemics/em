import { Action } from 'redux'
import { ThunkAction } from 'redux-thunk'
import { State, ThoughtsInterface } from './util/initialState'
import { GenericObject } from './utilTypes'

declare global {
  interface Window {
    firebase: any,
  }
}

/** A timestamp string. */
export type Timestamp = string

/** An entry in thoughtIndex[].contexts. */
export interface ThoughtContext {
  context: Context,
  rank: number,
  lastUpdated?: Timestamp,
  id?: string,
}

/** An object that contains a list of contexts where a lexeme appears in different word forms (plural, different cases, emojis, etc). All word forms hash to a given lexeme. */
export interface Lexeme {
  rank: number,
  value: string,
  contexts: ThoughtContext[],
  created: Timestamp,
  lastUpdated: Timestamp,
}

/** A thought with a specific rank. */
export interface Child {
  rank: number,
  value: string,
  id?: string,
  lastUpdated?: Timestamp,
}

/** A sequence of children with ranks. */
export type Path = Child[]

/** A sequence of values. */
export type Context = string[]

/** An object that contains a list of children within a context. */
export interface ParentEntry {
  children: Child[],
  lastUpdated: Timestamp,
  pending?: boolean,
}

/** A basic Redux action creator thunk with no arguments. */
export type ActionCreator = ThunkAction<void, State, unknown, Action<string>>

/** A Firebase realtime database snapshot. */
export type Snapshot<T = any> = {
  val: () => T,
}

/** A standard interface for data providers that can sync thoughts. See data-providers/README.md. */
export interface DataProvider {
  getManyDescendants: (contextMap: GenericObject<Path>, options: { maxDepth?: number }) => Promise<ThoughtsInterface>,
}
