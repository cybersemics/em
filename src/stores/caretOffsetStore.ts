import reactMinistore from './react-ministore'

/** A reactive store that tracks the caret's character offset within the focused thought, or null when no thought is
 * focused. Updated from the selectionchange event handler in initEvents.
 *
 * The browser selection is not part of the Redux state, so it cannot be read reactively from a component. This store
 * exposes just enough of it to render a faux caret on the other thoughts of a multiselection at the same offset as the
 * real caret (see Editable). A null offset doubles as the signal that no thought is being edited, which distinguishes
 * an actively edited multiselection from an idle one — the two are otherwise indistinguishable in the Redux state.
 */
const caretOffsetStore = reactMinistore<number | null>(null)

export default caretOffsetStore
