import { UnknownAction } from 'redux'
import type { TreecrdtRuntimeConfig } from '../data-providers/treecrdt/runtime'
import type { WindowEm } from '../initialize'
import Thunk from './Thunk'

/** Application configuration resolved before runtime modules are evaluated. */
export type BootstrapConfig = Readonly<{
  treecrdt: TreecrdtRuntimeConfig
}>

/** Bootstrap properties that may be injected onto window.em before the application bundle evaluates. */
export type BootstrapConfigOverrides = Partial<BootstrapConfig>

/** Bootstrap configuration and test flags that may be injected before the application initializes. */
export type PreloadedWindowEm = BootstrapConfigOverrides & {
  testFlags?: Partial<WindowEm['testFlags']>
}

/** Explicit pre-initialization view of window for bootstrap writers. */
export type PreloadedEmWindow = {
  em?: PreloadedWindowEm
}

declare global {
  interface Document {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DND: any
  }

  interface Window {
    /** Fully initialized application namespace. Bootstrap writers use {@link PreloadedEmWindow}. */
    em: WindowEm
    debug: (message: string) => void
    // FIX: Used only in puppeteer test environment. So need way to switch global context based on environment.
    delay: (ms: number) => Promise<boolean>
    /**
     * The Navigation API, used by the Navigate Back/Forward commands. Not yet included in the TypeScript DOM lib, so a minimal subset is declared here. Optional because it is unsupported in some browsers (e.g. older Safari).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation
     */
    navigation?: {
      /** True if there is a previous entry in the history that can be navigated to. */
      readonly canGoBack: boolean
      /** True if there is a next entry in the history that can be navigated to. */
      readonly canGoForward: boolean
      /** Navigates to the previous entry in the history. */
      back: () => void
      /** Navigates to the next entry in the history. */
      forward: () => void
    }
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
