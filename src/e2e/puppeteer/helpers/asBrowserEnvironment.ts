import { BrowserEnvironment } from '../../browserEnvironment/types'
import { fetchPage } from './setup'

/** Converts a Page to a BrowserEnvironment. */
const asBrowserEnvironment = (): BrowserEnvironment => ({
  // assert UnwrapPromiseLike<R> to Promise<R>
  execute: <R>(f: () => R) => fetchPage().evaluate(f) as Promise<R>,
})

export default asBrowserEnvironment
