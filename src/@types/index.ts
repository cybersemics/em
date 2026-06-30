import { UnknownAction } from 'redux'
import Thunk from './Thunk'

declare global {
  interface Document {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DND: any
  }

  interface Window {
    em: unknown
    debug: (message: string) => void
    // FIX: Used only in puppeteer test environment. So need way to switch global context based on environment.
    delay: (ms: number) => Promise<boolean>
  }

  interface Navigator {
    standalone: boolean
  }

  /** Options for constructing a ScrollTimeline. */
  interface ScrollTimelineOptions {
    /** The scrollable element whose scroll position drives the timeline. */
    source?: Element | null
    /** The scroll axis to use. */
    axis?: 'block' | 'inline' | 'x' | 'y'
  }

  /**
   * A scroll-driven AnimationTimeline for use with the Web Animations API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ScrollTimeline
   */
  class ScrollTimeline implements AnimationTimeline {
    constructor(options?: ScrollTimelineOptions)
    readonly currentTime: CSSNumberish | null
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
