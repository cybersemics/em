/** Simple async storage interface. */
interface Storage<T> {
  getItem: (key: string) => T | null | Promise<T | null>
  setItem: (key: string, value: T) => void | Promise<void>
}

export default Storage
