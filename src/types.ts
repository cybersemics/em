import { GetOperation } from 'fast-json-patch'
import { Dispatch, ReactNode } from 'react'
import { Action } from 'redux'
import { ThunkAction } from 'redux-thunk'
import { State } from './util/initialState'

declare global {
  interface Window {
      firebase:any,
      em: any,
  }
}

/** Possible return values of a sort's comparator function. */
export type ComparatorValue = 1 | -1 | 0

/** A standard comparator function used within sort. */
export type ComparatorFunction<T> = (a: T, b: T) => ComparatorValue

/** Set of file types supported for exporting thoughts. */
export type MimeType = 'text/plain' | 'text/html'

/** A very generic object. */
export type Index<T = any> = {[key: string]: T}

/** An option that can selected to set the export format. */
export interface ExportOption {
  type: MimeType,
  label: string,
  extension: string,
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

/** A parent context with a list of children. */
export interface Parent {
  context: Context,
  children: Child[],
  lastUpdated: Timestamp,
}

/** A basic Redux action creator thunk with no arguments. */
export type ActionCreator = ThunkAction<void, State, unknown, Action<string>>

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
  style?: React.CSSProperties,
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

export type Alert = {
  alertType?: string,
  showCloseLink?: boolean,
  value: string | null,
} | null

// Extend fast-json-patch Operation type to include actions list
// See fast-json-patch types: https://github.com/Starcounter-Jack/JSON-Patch/blob/89a09e94e0e6500115789e33586a75c8dd1aea13/module/core.d.ts
interface ExtendedOperation extends GetOperation<any> {
  actions: string[],
}

export type Patch = ExtendedOperation[]
