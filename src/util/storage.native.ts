import syncStorage from './nativeStorageHelper'

function getItem(key: string): string | null
function getItem(key: string, defaultValue: string | (() => string)): string

/** Gets the item from local storage. If it does not exist and defaultValue is provided, sets the value in local storage to defaultValue and returns it. */
function getItem(key: string, defaultValue?: string | (() => string)) {
  let value = syncStorage.getItem(key) ?? null
  if (value === null && defaultValue !== undefined) {
    value = typeof defaultValue === 'function' ? defaultValue() : defaultValue
    syncStorage.setItem(key, value)
  }
  return value
}

const storage = {
  clear(): void {
    syncStorage.clear()
  },

  getItem,

  removeItem(key: string): void {
    syncStorage.removeItem(key)
  },

  setItem(key: string, value: string): void {
    syncStorage.setItem(key, value)
  },
}

export default storage
