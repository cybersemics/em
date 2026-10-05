import ministore from './ministore'

/** Flags that suppress an editable's handlers while its content is being changed programmatically. A ministore rather than mutable globals so that resetStores clears them between tests; nothing subscribes, so a write never renders. */
const editableSyncStore = ministore({
  /** Suppresses the Editable change handler so that it ignores the execCommands in registerNativeUndoStep and in device/nativeHistory.ts. */
  suppressChange: false,
})

export default editableSyncStore
