import Patch from '../@types/Patch'
import ministore from './ministore'

/**
 * The editable whose last input changed nothing that was saved, such as whitespace typed at either end of a thought or
 * note, which is saved trimmed. Undo discards that input first, since it has no undo step of its own (#6347). Null
 * after an input that changed the saved value.
 *
 * The undo history at the time of the input is kept with it, so that any undoable action since, such as a command,
 * makes it no longer the last thing done.
 */
const unsavedInputStore = ministore<{
  /** The id of the thought being edited, or of the thought whose note is being edited. */
  thoughtId: string
  /** True if the input was in the thought's note. */
  note: boolean
  /** State.undoPatches after the input. */
  undoPatches: Patch[]
} | null>(null)

export default unsavedInputStore
