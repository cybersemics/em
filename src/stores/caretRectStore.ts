import * as selection from '../device/selection'
import isMultiEditing from '../selectors/isMultiEditing'
import store from './app'
import reactMinistore from './react-ministore'

/** A reactive store that tracks the position and height of the caret relative to the top left of the thought that holds
 * it. The values are null when no thought is being edited as part of a multiselection. Updated from the selectionchange
 * event handler in initEvents.
 *
 * The browser selection is not part of the Redux state, so it cannot be read reactively from a component. This store
 * exposes just enough of it to render a faux caret at the same position on the other thoughts of an edited
 * multiselection (see MulticursorFauxCaret). Mirroring the real caret's geometry keeps the two in sync no matter how
 * the thoughts' rendered values differ, e.g. while they are cleared, or when the value being typed has a trailing
 * space that is trimmed from the mirrored thoughts. A null rect doubles as the signal that no thought is being edited,
 * which distinguishes an actively edited multiselection from an idle one — the two are otherwise indistinguishable in
 * the Redux state.
 */
const caretRectStore = reactMinistore<{ x: number | null; y: number | null; height: number | null }>({
  x: null,
  y: null,
  height: null,
})

/** Measures the real caret and updates the store. Unthrottled, otherwise the faux caret visibly lags the real caret
 * while typing. Only an edited multiselection consumes the rect, so skip the heavier caretRect otherwise. Called from
 * the selectionchange and input handlers in initEvents, and again from MulticursorFauxCaret when the edited value
 * changes without either event, e.g. on undo. */
export const updateCaretRect = () => {
  const caretRect = isMultiEditing(store.getState()) ? selection.caretRect() : null
  caretRectStore.update({ x: caretRect?.x ?? null, y: caretRect?.y ?? null, height: caretRect?.height ?? null })
}

export default caretRectStore
