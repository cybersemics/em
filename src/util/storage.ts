let store = {} as any

export const storage = {
  clear(): void {
    // localStorage.clear()
    store = {}
  },

  getItem(key: string): string | null {
    // return localStorage.getItem(key)
    return store[key]
  },

  removeItem(key: string): void {
    // localStorage.removeItem(key)
    delete store[key]
  },

  setItem(key: string, value: string): void {
    // localStorage.setItem(key, value)
    store[key] = value
  },
}
