import { GetOperation } from 'fast-json-patch'
import { ReactNode } from 'react'
import { AnyAction } from 'redux'
import { State } from './util/initialState'
import { GestureResponderEvent } from 'react-native'

/********************************
 * Global
 ********************************/

declare global {
  interface Document {
    DND: any
    webkitHidden: any
    mozHidden: any
    msHidden: any
    oHidden: any
  }

  interface Window {
    firebase: Firebase
    em: unknown
    debug: (message: string) => void
    // FIX: Used only in puppeteer test environment. So need way to switch global context based on environment.
    delay: (ms: number) => Promise<boolean>
  }

  interface Navigator {
    standalone: boolean
  }
}

/********************************
 * Firebase
 ********************************/

interface Firebase {
  auth: (() => {
    currentUser: User
    onAuthStateChanged: (f: (user: User) => void) => void
    signInWithRedirect: (provider: any) => void
    createUserWithEmailAndPassword: (email: string, password: string) => Promise<{ user: User }>
    signInWithEmailAndPassword: (email: string, password: string) => Promise<{ user: User }>
    sendPasswordResetEmail: (email: string, passwordResetOptions: { url: string }) => Promise<void>
    signOut: () => void
  }) & { GoogleAuthProvider: any }
  database: () => {
    ref: (s: string) => Ref
  }
  initializeApp: (config: Index<string>) => void
}

export interface User {
  uid: string
  displayName: string
  email: string
  // see Firebase user for more properties
}

export interface Ref<T = any> {
  child: (name: string) => Ref<T>
  once: (eventName: string, callback?: (snapshot: Snapshot<T>) => void) => Promise<Snapshot>
  on: (eventName: string, callback: (snapshot: Snapshot<T>) => any) => void
  update: (updates: Index, callback?: (err: Error | null, ...args: any[]) => void) => Promise<any>
  off: (eventName: string) => void
}

export interface Snapshot<T = any> {
  val: () => T
}

/********************************
 * Everything else
 ********************************/

/**
 * A "Flavor" type is a nominal type that allows implicit conversation of objects with the same shape.
 * A "Brand" type is a nominal type that disallows implicit conversion.
 * See: https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/.
 */
interface Flavoring<FlavorT> {
  _type?: FlavorT
}
export type Flavor<T, FlavorT> = T & Flavoring<FlavorT>
declare const BrandSymbol: unique symbol
interface Brand<T> {
  [BrandSymbol]: T
}

/** Possible return values of a sort's comparator function. */
export type ComparatorValue = 1 | -1 | 0

/** A standard comparator function used within sort. */
export type ComparatorFunction<T> = (a: T, b: T) => ComparatorValue

/** Set of file types supported for exporting thoughts. */
export type MimeType = 'text/plain' | 'text/html'

/** A very generic object. */
export type Index<T = any> = { [key: string]: T }

/** An option that can selected to set the export format. */
export interface ExportOption {
  type: MimeType
  label: string
  extension: string
}

/** A timestamp string. */
export type Timestamp = string & Brand<'Timestamp'>

/** An entry in thoughtIndex[].contexts. */
export interface ThoughtContext {
  context: Context
  rank: number
  lastUpdated?: Timestamp
  id?: string
  archived?: Timestamp
}

/** An object that contains a list of contexts where a lexeme appears in different word forms (plural, different cases, emojis, etc). All word forms hash to a given lexeme. */
export interface Lexeme {
  id?: string // db only; not the same as Child id
  value: string
  contexts: ThoughtContext[]
  created: Timestamp
  lastUpdated: Timestamp
  updatedBy?: string
}

export interface ThoughtWordsIndex {
  id: string
  words: string[]
}

/** A thought with a specific rank. */
export interface Child {
  id?: string
  rank: number
  value: string
  lastUpdated?: Timestamp
  archived?: Timestamp
}

/** A sequence of children with ranks. */
export type Path = Child[]

/** A contiguous Path with no cycles. */
export type SimplePath = Child[] & Brand<'SimplePath'>

/** A sequence of values. */
export type Context = string[]

/** An object that contains a list of children within a context. */
export interface Parent {
  id?: string
  context: Context
  children: Child[]
  lastUpdated: Timestamp
  pending?: boolean
  updatedBy?: string
}

/** Sort Preferences with type and direction. */
export interface SortPreference {
  type: string
  direction: SortDirection | null
}

export type SortDirection = 'Asc' | 'Desc'

/** Extends store.dispatch to allow arrays and thunks.
 *
 * @example
  store.dispatch({ type: 'aa' }) // void
  store.dispatch([{ type: 'aa' }, { type: 'a2' }]) // void
  store.dispatch(dispatch => dispatch({ type: 'bb' })) // void
  store.dispatch(dispatch => {
    dispatch({ type: 'bb' })
    return 1
  }) // number
  store.dispatch(async dispatch => {
    dispatch({ type: 'bb' })
    const result = await Promise.resolve(1)
    return result
  }) // Promise<number>
 */
declare module 'redux' {
  export interface Dispatch {
    <T = void>(thunks: Thunk<T>[]): T[]
    <T = void>(thunk: Thunk<T>): T
    (actions: (AnyAction | Thunk)[]): void
    (action: AnyAction | Thunk): void
  }
}

// allow explicit import
export interface Dispatch {
  <T = void>(thunks: Thunk<T>[]): T[]
  <T = void>(thunk: Thunk<T>): T
  (actions: (AnyAction | Thunk)[]): void
  (action: AnyAction | Thunk): void
}

/** A basic Redux AnyAction creator thunk with no arguments. */
// do not use ThunkDispatch since it has the wrong return type
export type Thunk<R = void> = (dispatch: Dispatch, getState: () => State) => R

/** The three options the user can choose for the context tutorial. */
export type TutorialChoice = 0 | 1 | 2

/** When a component is connected, the dispatch prop is added. */
export type Connected<T> = T & {
  dispatch: Dispatch
}

export interface Log {
  created: Timestamp
  message: string
  stack?: any
}

export interface Icon {
  dark?: boolean
  fill?: string
  height?: number
  size?: number
  style?: React.CSSProperties
  width?: number
}

export interface Key {
  alt?: boolean // Mac: Option, Windows: Alt
  control?: boolean
  key: string
  meta?: boolean // Mac: Command, Windows: Control
  shift?: boolean
}

export interface Shortcut {
  // a function that returns true if the shortcut can be executed with the current state
  canExecute?: (getState: () => State) => boolean

  // an ad hoc property to track conflicting shortcuts
  // this should not be in the main Shortcut type
  conflicts?: string[]

  // a description of what the shortcut does that is shown in the Help modal
  description?: string

  // executes the shortcut
  exec: (
    dispatch: Dispatch,
    getState: () => State,
    e: Event | GestureResponderEvent | React.MouseEvent,
    { type }: { type: string },
  ) => void

  // a MultiGesture sequence to activate the shortcut on touch screens
  gesture?: GesturePath | GesturePath[]

  // hide the shortcut from the Help modal
  hideFromInstructions?: boolean

  // a readable, internal unique id
  id: string

  // a function that returns true if the shortcut should be highlighted in the Toolbar
  isActive?: (getState: () => State) => boolean

  // a keyboard sequence to activate the shortcut
  keyboard?: Key | string

  // a short label that is shown in the gesture hint
  label: string

  // specify backup gesture or keyboard that is shown in the Toolbar overlay
  overlay?: {
    gesture?: GesturePath
    keyboard?: Key | string
  }

  // an icon that represents the shortcut in the Toolbar
  svg?: (icon: Icon) => ReactNode
}

export type Direction = 'u' | 'd' | 'l' | 'r'

export type DirectionMap<T> = (dir: Direction) => T

// allow string explicitly since Typescript will not allow Direction[] to be specified as a string
export type GesturePath = string | Direction[]

export type Alert = {
  alertType?: string
  showCloseLink?: boolean
  value: string | null
} | null

// Extend fast-json-patch Operation type to include actions list
// See fast-json-patch types: https://github.com/Starcounter-Jack/JSON-Patch/blob/89a09e94e0e6500115789e33586a75c8dd1aea13/module/core.d.ts
interface ExtendedOperation<T = any> extends GetOperation<T> {
  actions: string[]
}

export type Patch = ExtendedOperation[]

export type ContextHash = string & Brand<'ContextHash'>
export type ThoughtHash = string & Brand<'ThoughtHash'>

// jex-block-parser type
// Waiting on PR: https://github.com/reergymerej/block-parser/pull/1
export interface Block {
  scope: string
  created?: Timestamp
  lastUpdated?: Timestamp
  children: Block[]
}

export interface ThoughtIndices {
  contextIndex: Index<Parent>
  thoughtIndex: Index<Lexeme>
}

export interface ThoughtUpdates {
  contextIndex: Index<Parent | null>
  thoughtIndex: Index<Lexeme | null>
}

export type ThoughtsInterface = ThoughtIndices

// type to unpack a Promise
export type Await<T> = T extends PromiseLike<infer U> ? U : T

export type Timer = ReturnType<typeof setTimeout>

/*
  Represents the result of a split operation on an Editable.

  In the simple case, left + right === value.
  In the more complex case, beginning and ending tags are regenerated if an element gets split.

  e.g. <b>bold and <i>italic<i></b>.

  Splitting after "and" yields:

  {
    left: '<b>bold and </b>',
    right: '<b><i>italic</i></b>'
  }
*/
export interface SplitResult {
  left: string
  right: string
}

/** An environment for evaluating expressions defined by lazily loaded Contexts. */
export type LazyEnv = Index<Context>
