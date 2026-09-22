# Learning Journey

The learning journey is tracked in [#5481](https://github.com/cybersemics/em/issues/5481).

`state.learning` stores a device-specific `pinnedCommandId` and sparse practice records keyed by command ID. Pinning creates a record with a captured target; pinning the same command retains it, while replacing or removing the pin erases the previous record. These actions are excluded from editing undo.

`storageModel` stores this state under `learning`. `initialState` restores it alongside font size and jump history. Decoding validates the stored shape and drops malformed records without importing the command registry. Consumers must ignore IDs no longer available in the current command registry.

Practice records are local for now. User-wide learning progress and synchronization remain deferred. Successful user keyboard and gesture invocations of the current pin earn one rep, persisted locally. Clicks and programmatic calls earn none.

Command Universe detail pages offer Pin and Unpin controls. Pinning another command replaces the selection; the row describes which command will be replaced. These controls do not execute commands.

## Corner widget

The selected command appears in a sticky bottom-right slot alongside the NavBar. The row reserves room for the ring and respects the bottom safe area. Unknown saved commands render no widget.

`PinnedCommandRing` composes same-file components for its track, gradient/blur bands, progress arc, and centered icon. It accepts supplied progress and color opacity; the live widget displays its saved reps divided by the captured target. The snapshot fixture covers empty, partial, full, and colorful states with filters enabled.

Each new rep animates the fill from its current visible angle. Reduced motion renders the new fill immediately. Reps continue beyond the target while the visible fill and accessible count cap at the target. No command is marked learned and no history is retained after switching pins.

Locally earned reps at or past the target request a flourish: one spin and a color pulse, with the completing fill finishing during the first half. Rendering restored full progress does not celebrate. Reduced motion retains the color pulse but skips the spin. Each rep also animates the command icon unless a toggle has just switched off.
