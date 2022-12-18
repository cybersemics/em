const storage = {
  clear(): void {
    localStorage.clear()
  },

  /** Gets the item from local storage. If it does not exist and defaultValue is provided, sets the value in local storage to defaultValue and returns it. */
  getItem(key: string, defaultValue?: string | (() => string)): string | null {
    let value = localStorage.getItem(key)
    if (value === null && defaultValue !== undefined) {
      value = typeof defaultValue === 'function' ? defaultValue() : defaultValue
      localStorage.setItem(key, value)
    }
    return value
  },

  removeItem(key: string): void {
    localStorage.removeItem(key)
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value)
  },
}

export default storage
