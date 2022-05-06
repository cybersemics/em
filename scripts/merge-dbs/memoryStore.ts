/** A simple in-memory localStorage/sessionStorage shim. */
const memoryStore = () => {
  let store = {} as any
  let length = 0
  return {
    get length() {
      return length
    },
    clear: () => (store = {}),
    key: (index: number) => {
      throw new Error('Not implemented in mock')
    },
    getItem: (key: string) => store[key],
    setItem: (key: string, value: any) => {
      if (!(key in store)) {
        length++
      }
      store[key] = value
    },
    removeItem: (key: string) => {
      if (key in store) {
        length--
      }
      delete store[key]
    },
  }
}

export default memoryStore