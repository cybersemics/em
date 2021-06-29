const storage = {
  clear(): void {
    localStorage.clear()
  },

  getItem(key: string): string | null {
    return localStorage.getItem(key)
  },

  removeItem(key: string): void {
    localStorage.removeItem(key)
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value)
  },
}

export { storage }
