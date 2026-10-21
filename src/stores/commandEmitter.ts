import Emitter from 'emitter20'

/**
 * Carries one-off signals about commands that change no state.
 *
 * - `command` — before a command executes.
 * - `commandSucceeded` — after a top-level invocation succeeds, with its CommandSuccess outcome.
 * - `pinnedGestureDryRun` — the pinned command's gesture was traced over the Mobile Command Universe as a dry run.
 * - `pinnedGestureRejected` — a gesture other than the pinned command's was traced while its tooltip was open, whether or not it matches a command.
 */
const commandEmitter = new Emitter()

export default commandEmitter
