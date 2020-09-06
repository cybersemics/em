import { Dispatch, ReactNode } from 'react'
import { Action } from 'redux'
import { ThunkAction } from 'redux-thunk'
import { State, ThoughtsInterface } from './util/initialState'
import { GenericObject } from './utilTypes'

declare global {
  interface Window {
    firebase: any,
    em: any,
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
  archived?: Timestamp,
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
  archived?: Timestamp,
}

/** A sequence of children with ranks. */
export type Path = Child[]

/** A sequence of values. */
export type Context = string[]

/** An object that contains a list of children within a context. */
export interface ParentEntry {
  id?: string,
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

/** The three options the user can choose for the context tutorial. */
export type TutorialChoice = 0 | 1 | 2

/** When a component is connected, the dispatch prop is added. */
export type Connected<T> = T & {
  dispatch: any,
}

export interface Log {
  created: Timestamp,
  message: string,
  stack?: any,
}

export interface Icon {
  dark?: boolean,
  fill?: string,
  height?: number,
  size: number,
  style?: GenericObject<string>,
  width?: number,
}

export interface Key {
  alt?: boolean,
  control?: boolean,
  key: string,
  meta?: boolean,
  option?: boolean,
  shift?: boolean,
}

export interface Shortcut {
  id: string,
  name: string,
  description?: string,
  gesture?: GesturePath | GesturePath[],
  hideFromInstructions?: boolean,
  keyboard?: Key | string,
  overlay?: {
    gesture?: GesturePath,
    keyboard?: Key | string,
  },
  svg?: (icon: Icon) => ReactNode,
  canExecute?: (getState: () => State, e: Event) => boolean,
  exec: (dispatch: Dispatch<Action | ActionCreator>, getState: () => State, e: Event, { type }: { type: string }) => void,
}

export type Direction = 'u' | 'd' | 'l' | 'r'

export type DirectionMap<T> = (dir: Direction) => T

// allow string explicitly since Typescript will not allow Direction[] to be specified as a string
export type GesturePath = string | (Direction[] & {
  map: DirectionMap<Direction>,
  split: (s: string) => Direction[],
})
