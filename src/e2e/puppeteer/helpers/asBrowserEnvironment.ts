import { BrowserEnvironment } from '../../browserEnvironment/types'
import { page } from '../setup'

/** Converts a Page to a BrowserEnvironment. */
const asBrowserEnvironment = (): BrowserEnvironment => ({
  // assert UnwrapPromiseLike<R> to Promise<R>
  execute: <R>(f: () => R) => page.evaluate(f) as Promise<R>,
})

export default asBrowserEnvironment
