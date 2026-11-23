import Patch from '../@types/Patch'
import ministore from './ministore'

/** State about an editable's content being out of step with Redux, either because it is being changed programmatically or because it holds input that was never saved. A ministore rather than mutable globals so that resetStores clears it between tests; nothing subscribes, so a write never renders. */
const editableSyncStore = ministore({
  /** Suppresses the Editable change handler so that it ignores the execCommands in registerNativeUndoStep and in device/nativeHistory.ts. */
  suppressChange: false,
  /** Suppresses the blur handlers that resync the editable's innerHTML to the value in Redux. Set while the editable is momentarily blurred and refocused to retarget focus after iOS autocomplete, which does not end editing. */
  suppressBlurSync: false,
  /**
   * State.undoPatches as it was after the last input into a thought or note that changed nothing saved, such as
   * whitespace typed at either end, which is saved trimmed. Null after an input that changed the saved value. Undo
   * discards the unsaved input first only while this is still State.undoPatches, i.e. while no undoable action has
   * happened since, which includes moving the cursor to another editable (#6347).
   */
  unsavedInputUndoPatches: null as Patch[] | null,
})

export default editableSyncStore
