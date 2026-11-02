import Emitter from 'emitter20'

/** Notifies listeners before command execution and after a successful invocation settles. */
const commandEmitter = new Emitter()

export default commandEmitter
