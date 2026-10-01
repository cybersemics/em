import { UnknownAction } from 'redux'
import type { WindowEm } from '../initialize'
import Thunk from './Thunk'

/** Explicit pre-initialization view of window for preload scripts. */
export type PreloadedEmWindow = {
  em?: {
    testFlags?: Partial<WindowEm['testFlags']>
  }
}

declare global {
  interface Document {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DND: any
  }

  interface Window {
    /** Fully initialized application namespace. Preload writers use {@link PreloadedEmWindow}. */
    em: WindowEm
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
    (actions: (UnknownAction | Thunk)[]): void
    (action: UnknownAction | Thunk): void
  }
}
