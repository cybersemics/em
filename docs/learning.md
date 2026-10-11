# Learning Journey

The learning journey is tracked in [#5481](https://github.com/cybersemics/em/issues/5481).

`state.learning` stores a device-specific `pinnedCommandId` and sparse practice records keyed by command ID. Pinning creates a record with a captured target; pinning the same command retains it, while replacing or removing the pin erases the previous record. These actions are excluded from editing undo.

`storageModel` stores this state under `learning`. `initialState` restores it alongside font size and jump history. Decoding validates the stored shape and drops malformed records without importing the command registry. Consumers must ignore IDs no longer available in the current command registry.

Practice records are local for now. User-wide learning progress and synchronization remain deferred. Practice counting is introduced in a subsequent layer.

Command Universe detail pages offer Pin and Unpin controls. Pinning another command replaces the selection; the row describes which command will be replaced. These controls do not execute commands.

## Corner widget

The selected command appears in a sticky bottom-right slot alongside the NavBar. The row reserves room for the ring and respects the bottom safe area. Unknown saved commands render no widget.

`PinnedCommandRing` composes same-file components for its track, gradient/blur bands, progress arc, and centered icon. It accepts supplied progress and color opacity; the live widget currently displays an empty ring. The snapshot fixture covers empty, partial, full, and colorful states with filters enabled.
