const storeSession = {
  clear(): void {
    sessionStorage.clear()
  },

  getItem(key: string): string | null {
    return sessionStorage.getItem(key)
  },

  removeItem(key: string): void {
    sessionStorage.removeItem(key)
  },

  setItem(key: string, value: string): void {
    sessionStorage.setItem(key, value)
  },
}

export default storeSession
