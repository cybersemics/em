/** A Browser environment in which commands can be executed. */
export interface BrowserEnvironment {
  execute: <R>(f: () => R) => Promise<R>
}
