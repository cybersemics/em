import { Firebase } from './Firebase'
import { Thunk } from './Thunk'

export type { Alert } from './Alert'
export type { Await } from './Await'
export type { Block } from './Block'
export type { ChatIconProps } from './ChatIconProps'
export type { Child } from './Child'
export type { ComparatorFunction } from './ComparatorFunction'
export type { ComparatorValue } from './ComparatorValue'
export type { Connected } from './Connected'
export type { Context } from './Context'
export type { ContextHash } from './ContextHash'
export type { Direction } from './Direction'
export type { DirectionMap } from './DirectionMap'
export type { Dispatch } from './Dispatch'
export type { ExportOption } from './ExportOption'
export type { GesturePath } from './GesturePath'
export type { Icon } from './Icon'
export type { Index } from './IndexType'
export type { InviteCodes } from './InviteCodes'
export type { Key } from './Key'
export type { LazyEnv } from './LazyEnv'
export type { Lexeme } from './Lexeme'
export type { Log } from './Log'
export type { MimeType } from './MimeType'
export type { Parent } from './Parent'
export type { Patch } from './Patch'
export type { Path } from './Path'
export type { PushBatch } from './PushBatch'
export type { RecentlyEditedTree } from './RecentlyEditedTree'
export type { Shortcut } from './Shortcut'
export type { SimplePath } from './SimplePath'
export * as Firebase from './Firebase'
export type { SortDirection } from './SortDirection'
export type { SortPreference } from './SortPreference'
export type { SplitResult } from './SplitResult'
export type { State } from './State'
export type { ThoughtContext } from './ThoughtContext'
export type { ThoughtHash } from './ThoughtHash'
export type { ThoughtIndices } from './ThoughtIndices'
export type { ThoughtsInterface } from './ThoughtsInterface'
export type { ThoughtUpdates } from './ThoughtUpdates'
export type { ThoughtWordsIndex } from './ThoughtWordsIndex'
export type { Thunk } from './Thunk'
export type { Timer } from './Timer'
export type { Timestamp } from './Timestamp'
export type { TutorialChoice } from './TutorialChoice'

declare global {
  interface Document {
    DND: any
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
