import ministore from './ministore'

/** Tracks recycleNativeHistory's replay of a native undo/redo, which moves WebKit's position through its own history (#4984). */
const nativeHistoryReplayStore = ministore({
  /** Whether a native undo/redo is being replayed, so that the `beforeinput` it dispatches is swallowed instead of routed to em's undo/redo a second time. */
  replaying: false,
  /** How many history `beforeinput` events the replay dispatched. WebKit keeps reporting `queryCommandEnabled('undo')` as true after it has stopped dispatching the event, so the dispatch itself is the only reliable signal that a step is still there. */
  replayedEvents: 0,
})

export default nativeHistoryReplayStore
