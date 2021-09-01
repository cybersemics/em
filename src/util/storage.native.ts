import syncStorage from './nativeStorageHelper'

export const storage = {
  clear(): void {
    syncStorage.clear()
  },

  getItem(key: string): string | null {
    return syncStorage.getItem(key) ?? null
  },

  removeItem(key: string): void {
    syncStorage.removeItem(key)
  },

  setItem(key: string, value: string): void {
    syncStorage.setItem(key, value)
  },
}

export const sessionStorage = {
  clear(): void {
    syncStorage.clear()
  },

  getItem(key: string): string | null {
    return syncStorage.getItem(key) ?? null
  },

  removeItem(key: string): void {
    syncStorage.removeItem(key)
  },

  setItem(key: string, value: string): void {
    syncStorage.setItem(key, value)
  },
}
