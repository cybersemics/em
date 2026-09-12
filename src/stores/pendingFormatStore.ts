import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'
import reactMinistore from './react-ministore'

/** A ministore holding the formatting that has been applied to empty thoughts but not yet typed into (#3910). An
 * empty thought's value must stay empty, so the formatting cannot be stored there; it is held here, keyed by thought
 * id, until the user types, at which point `Editable` transfers the tags onto the typed text and clears the entry.
 *
 * The formatting is stored as an ordinary thought value wrapping a single placeholder character, e.g.
 * `<font color="#00d688">x</font>`, so that it composes through the same utilities as a real value: further commands
 * are applied to it with `formatSelectionHtml` (toggling bold off, replacing a color), `getCommandState` derives the
 * toolbar state from it, and `applyOuterTags` transfers its wrappers onto the typed text.
 */
const pendingFormatStore = reactMinistore<{ formats: Index<string> }>({ formats: {} })

/** Returns the formatting held for an empty thought, or undefined if none is held. */
export const getPendingFormat = (id: ThoughtId): string | undefined => pendingFormatStore.getState().formats[id]

/** Sets the formatting held for an empty thought. */
export const setPendingFormat = (id: ThoughtId, value: string) =>
  pendingFormatStore.update(({ formats }) => ({ formats: { ...formats, [id]: value } }))

/** Removes the formatting held for a thought, if any. */
export const clearPendingFormat = (id: ThoughtId) =>
  pendingFormatStore.update(({ formats }) => {
    if (!(id in formats)) return {}
    const { [id]: _, ...formatsRest } = formats
    return { formats: formatsRest }
  })

export default pendingFormatStore
