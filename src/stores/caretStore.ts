import * as selection from '../device/selection'
import debugLog from '../util/debugLog'
import reactMinistore from './react-ministore'

/** The browser selection, as seen from the element holding the focus. */
export interface ObservedSelection {
  /** The element holding the focus, or null when nothing does. */
  focused: HTMLElement | null
  /** The plain-text offset of the selection's focus within the focused element, or null when the selection is outside it. */
  offset: number | null
  /** Whether the selection is a collapsed caret. */
  collapsed: boolean
}

/** What asked for a caret placement. Recorded with the target so that a placement says why it happened. */
export type CaretSource =
  // useEditMode's declarative effect, placing the caret at state.cursorOffset.
  | 'cursorOffset'
  // useEditMode's onMouseDown, placing the caret where the mouse landed.
  | 'mouseDown'
  // useCaretRestore, pulling the caret back after the iOS keyboard trackpad dragged it out of the editable.
  | 'restore'
  // useRevertCorrection, putting the caret back where a tap landed after iOS moved it back.
  | 'revert'

/** A caret placement the app has asked for. */
export interface CaretTarget {
  editable: HTMLElement
  offset?: number
  end?: boolean
  source: CaretSource
}

/**
 * A reactive representation of the browser selection, and the caret the app wants. The selection is observed from the
 * selectionchange handler in initEvents, so it can be subscribed to with selectors outside the render cycle. Placing
 * the caret writes a target, which the subscriber below applies synchronously, since a placement often competes with
 * the browser's own handling of a touch and cannot wait for a render.
 *
 * Each placement is a new target object, so asking for the same place twice is still a change. This is what lets a
 * correction put the caret back where an earlier placement already put it.
 */
const caretStore = reactMinistore<{ selection: ObservedSelection; target: CaretTarget | null }>({
  selection: { focused: null, offset: null, collapsed: true },
  target: null,
})

/** Reads the browser selection into the store. Skips the update when nothing changed, so that subscribers see only real moves. */
export const observeSelection = () => {
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  // Measured only on an editable, since measuring the focus of a selection within the body would walk the whole page.
  const offset = focused?.hasAttribute('contenteditable') ? selection.offsetFromNode(focused) : null
  const collapsed = selection.isCollapsed()
  const old = caretStore.getState().selection
  if (old.focused === focused && old.offset === offset && old.collapsed === collapsed) return
  caretStore.update({ selection: { focused, offset, collapsed } })
}

/** Asks for the caret to be placed in the given editable. Applied synchronously. */
export const placeCaret = (
  editable: HTMLElement,
  { offset, end, source }: { offset?: number; end?: boolean; source: CaretSource },
) => caretStore.update({ target: { editable, offset, end, source } })

// The one place that applies a caret placement. resetStores sets the target back to null, which places nothing.
caretStore.subscribeSelector(
  state => state.target,
  target => {
    if (!target) return
    // Every placement em makes during a tap, so that a log can tell em's caret moves from iOS's (#6178).
    debugLog.log('placeCaret', () => ({
      source: target.source,
      label: target.editable.getAttribute('aria-label'),
      offset: target.offset ?? null,
      end: !!target.end,
    }))
    selection.set(target.editable, { offset: target.offset, end: target.end })
  },
)

export default caretStore
