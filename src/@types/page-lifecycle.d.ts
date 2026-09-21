/** Ambient module declaration for page-lifecycle, whose npm package ships no TypeScript types.
 *
 * Describes the public API of https://github.com/GoogleChromeLabs/page-lifecycle. Only the statechange event is
 * typed, since the library dispatches no other event.
 */
declare module 'page-lifecycle' {
  /** The lifecycle states that the library reports. The Page Lifecycle API also defines a discarded state, but a discarded page runs no script, so the library never reports it. */
  type PageState = 'active' | 'passive' | 'hidden' | 'frozen' | 'terminated'

  /** The event dispatched on every lifecycle state change. */
  interface StateChangeEvent extends Event {
    /** The state the page transitioned to. */
    readonly newState: PageState
    /** The state the page transitioned from. */
    readonly oldState: PageState
    /** The browser event that triggered the transition, e.g. visibilitychange or blur. */
    readonly originalEvent: Event
  }

  /** The singleton that observes the page lifecycle. */
  interface Lifecycle extends EventTarget {
    /** The current lifecycle state. */
    readonly state: PageState
    /** Whether the browser discarded the page and later reloaded it, i.e. `document.wasDiscarded`. */
    readonly pageWasDiscarded: boolean
    addEventListener(
      type: 'statechange',
      listener: (event: StateChangeEvent) => void,
      options?: boolean | AddEventListenerOptions,
    ): void
    removeEventListener(
      type: 'statechange',
      listener: (event: StateChangeEvent) => void,
      options?: boolean | EventListenerOptions,
    ): void
    /** Registers unsaved changes under a unique id. The user is prompted before the page unloads until every id has been removed. */
    addUnsavedChanges(id: symbol | object): void
    /** Removes the unsaved changes registered under the id. */
    removeUnsavedChanges(id: symbol | object): void
  }

  const lifecycle: Lifecycle
  export default lifecycle
}
