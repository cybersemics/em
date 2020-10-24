import { GetOperation } from 'fast-json-patch'
import { Dispatch, ReactNode } from 'react'
import { Action } from 'redux'
import { ThunkDispatch } from 'redux-thunk'
import { State } from './util/initialState'

/********************************
 * Firebase types
 ********************************/

interface Firebase {
  auth: () => {
    currentUser: User,
    onAuthStateChanged: (f: (user: User) => void) => void,
  },
  database: () => {
    ref: (s: string) => Ref,
  },
  initializeApp: (config: Index<string>) => void,
}

export interface User {
  uid: string,
  displayName: string,
  email: string,
  // see Firebase user for more properties
}

export interface Ref {
  on: (s: string, f: (...args: any) => any) => void,
  once: (s: string, f: (...args: any) => any) => void,
  update: (updates: Index<any>, callback: (err: string | null, ...args: any[]) => void) => void,
}

export interface Snapshot<T> {
  val: () => T,
}

declare global {
  interface Window {
      firebase: Firebase,
      em: unknown,
  }

  interface Navigator {
    standalone: boolean,
  }
}


/********************************
 * Util types
 ********************************/

/**
 * A "Flavor" type is a nominal type that allows implicit conversation of objects with the same shape.
 * A "Brand" type is a nominal type that disallows implicit conversion.
 * See: https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/.
 */
interface Flavoring<FlavorT> { _type?: FlavorT }
export type Flavor<T, FlavorT> = T & Flavoring<FlavorT>
declare const BrandSymbol: unique symbol
interface Brand<T> { [BrandSymbol]: T }

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
export type Timestamp = string & Brand<'Timestamp'>

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

/** A contiguous Path with no cycles. */
export type SimplePath = Child[] & Brand<'SimplePath'>

/** A sequence of values. */
export type Context = string[]

/** A parent context with a list of children. */
export interface Parent {
  context: Context,
  children: Child[],
  lastUpdated: Timestamp,
}

/** A basic Redux action creator thunk with no arguments. */
// do not use ThunkAction<void, State, any, Action<string>> to avoid extraArgument
export type ActionCreator = ((dispatch: ThunkDispatch<State, never, Action<string>>, getState: () => State) => any)

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
interface ExtendedOperation<T = any> extends GetOperation<T> {
  actions: string[],
}

export type Patch = ExtendedOperation[]

export type ContextHash = string & Brand<'ContextHash'>
export type ThoughtHash = string & Brand<'ThoughtHash'>
