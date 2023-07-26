/** Simple async storage interface. */
interface Storage {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: any) => void | Promise<void>
}

export default Storage
