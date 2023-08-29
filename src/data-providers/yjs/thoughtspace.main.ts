/** API on the main thread to access the thoughtspace web worker at thoughtspace.worker.ts. */
import { proxy, wrap } from 'comlink'
import sleep from '../../util/sleep'
import { DataProvider } from '../DataProvider'
import { ThoughtspaceOptions } from './thoughtspace'
import ThoughtspaceWorker, { api } from './thoughtspace.worker'

// the rate that the monitor function pings the web worker
const MONITOR_PING_RATE = 1000

// how long before a monitor ping times out
const MONITOR_PING_TIMEOUT = 1000

/** Convert a Remote type back into a regular promise. */
const unwrap =
  <T extends any[], R>(f: (...args: T) => Promise<R>) =>
  (...args: T) =>
    f(...args)

// Instantiate worker
const worker = new ThoughtspaceWorker()
const workerApi = wrap<typeof api>(worker)

export const clear = unwrap(workerApi.clear)
export const freeLexeme = unwrap(workerApi.freeLexeme)
export const freeThought = unwrap(workerApi.freeThought)
export const getLexemeById = unwrap(workerApi.getLexemeById)
export const getLexemesByIds = unwrap(workerApi.getLexemesByIds)
export const getThoughtById = unwrap(workerApi.getThoughtById)
export const getThoughtsByIds = unwrap(workerApi.getThoughtsByIds)
export const pauseReplication = unwrap(workerApi.pauseReplication)
export const replicateLexeme = unwrap(workerApi.replicateLexeme)
export const replicateThought = unwrap(workerApi.replicateThought)
export const startReplication = unwrap(workerApi.startReplication)
export const updateThoughts = unwrap(workerApi.updateThoughts)

/** Proxy init options since it includes callbacks. */
export const init = (options: ThoughtspaceOptions) => workerApi.init(proxy(options))

/** Ping the web worker on an interval and fire a callback if it is unresponsive. */
export const monitor = (cb: (error: string | null) => void) => {
  setInterval(async () => {
    const success = await Promise.race([workerApi.ping(), sleep(MONITOR_PING_TIMEOUT)])
    cb(success ? null : 'Thoughtspace web worker timeout')
  }, MONITOR_PING_RATE)
}

const db: DataProvider = {
  clear,
  freeLexeme,
  freeThought,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
