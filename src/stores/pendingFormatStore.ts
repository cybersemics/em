import ThoughtId from '../@types/ThoughtId'
import reactMinistore from './react-ministore'

/** A ministore holding the formatting that has been applied to an empty thought but not yet typed into (#3910). An
 * empty thought's value must stay empty, so the formatting cannot be stored there; it is held here until the user
 * types, at which point `Editable` transfers the tags onto the typed text and clears the store. `id` is null when no
 * formatting is being held.
 *
 * The formatting is stored as an ordinary thought value wrapping a single placeholder character, e.g.
 * `<font color="#00d688">x</font>`, so that it composes through the same utilities as a real value: further commands
 * are applied to it with `formatSelectionHtml` (toggling bold off, replacing a color), `getCommandState` derives the
 * toolbar state from it, and `applyOuterTags` transfers its wrappers onto the typed text.
 */
const pendingFormatStore = reactMinistore<{ id: ThoughtId | null; value: string }>({ id: null, value: '' })

export default pendingFormatStore
