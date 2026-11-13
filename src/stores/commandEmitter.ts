import Emitter from 'emitter20'

/**
 * Carries one-off signals about commands that change no state.
 *
 * - `command` — before a command executes, or a tap moves the cursor. Each Editable saves the edit waiting in its throttle, so that the command or the move comes after it in the undo history.
 * - `commandSucceeded` — after a top-level invocation succeeds, with its CommandSuccess outcome.
 * - `pinnedGestureDryRun` — the pinned command's gesture was traced over the Mobile Command Universe as a dry run.
 */
const commandEmitter = new Emitter()

export default commandEmitter
