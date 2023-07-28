import { expose, proxy } from 'comlink'
import Index from '../../@types/IndexType'
import Thought from '../../@types/Thought'
import * as thoughtspace from './thoughtspace'

/** Proxy replicateTree since it takes a callback and CancellablePromise cannot cross the worker boundary. */
export const replicateTree = async (
  ...args: Parameters<typeof api.replicateTree>
): Promise<{ promise: Promise<Index<Thought>>; cancel: () => void }> => {
  const { promise, cancel } = await api.replicateTree(...args)
  return proxy({ promise, cancel })
}

// eslint-disable-next-line export-default-identifier/export-default-identifier
export default {} as typeof Worker & { new (): Worker }

export const api = thoughtspace

expose(api)
