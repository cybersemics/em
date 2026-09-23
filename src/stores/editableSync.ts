import ministore from './ministore'

/** Flags that suppress an editable's handlers while its content is being changed programmatically. A ministore rather than mutable globals so that resetStores clears them between tests; nothing subscribes, so a write never renders. */
const editableSyncStore = ministore({
  /** Suppresses the Editable change handler so that it ignores the execCommand in registerNativeUndoStep. */
  suppressChange: false,
  /** Suppresses the blur handlers that resync the editable's innerHTML to the value in Redux. Set while the editable is momentarily blurred and refocused to retarget focus after iOS autocomplete, which does not end editing. */
  suppressBlurSync: false,
})

export default editableSyncStore
