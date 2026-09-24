# Learning Journey

The learning journey is tracked in [#5481](https://github.com/cybersemics/em/issues/5481).

`state.learning` stores a device-specific `pinnedCommandId` and sparse practice records keyed by command ID. Pinning creates a record with a captured target; pinning the same command retains it, while replacing or removing the pin erases the previous record. These actions are excluded from editing undo.

`storageModel` stores this state under `learning`. `initialState` restores it alongside font size and jump history. Decoding validates the stored shape and drops malformed records without importing the command registry. Consumers must ignore IDs no longer available in the current command registry.

Practice records are local for now. User-wide learning progress and synchronization remain deferred. Controls, the corner widget, and practice counting are introduced in subsequent layers.
