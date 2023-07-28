/** API on the main thread to access the thoughtspace web worker at thoughtspace.worker.ts. */
import { proxy, wrap } from 'comlink'
import Index from '../../@types/IndexType'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import cancellable, { CancellablePromise } from '../../util/cancellable'
import { DataProvider } from '../DataProvider'
import { ThoughtspaceOptions } from './thoughtspace'
// import { DataProvider } from '../DataProvider'
import ThoughtspaceWorker, { api } from './thoughtspace.worker'

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

/** Proxy init since it takes callbacks. */
export const init = (options: ThoughtspaceOptions) =>
  workerApi.init(
    proxy({
      ...options,
      accessToken: Promise.resolve(options.accessToken),
      tsid: Promise.resolve(options.tsid),
      websocketUrl: Promise.resolve(options.websocketUrl),
    }),
  )

/** Proxy replicateTree since it takes a callback. */
export const replicateTree = (
  id: ThoughtId,
  {
    remote,
    onThought,
  }: {
    /** Sync with Websocket. Default: true. */
    remote?: boolean
    onThought?: (thought: Thought, thoughtIndex: Index<Thought>) => void
  } = {},
): CancellablePromise<Index<Thought>> => {
  // outer Promise is for the proxy call
  // inner Promise resolves when the replication is complete
  const proxyPromise = workerApi.replicateTree(
    id,
    proxy({
      remote: Promise.resolve(!!remote),
      onThought,
    }),
  )
  return cancellable(
    proxyPromise.then(({ promise }) => promise),
    () => {
      proxyPromise.then(({ cancel }) => cancel())
    },
  )
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
