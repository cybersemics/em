/* eslint-disable fp/no-class */
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 *
 */
function handleError(func: string, param?: string): Promise<string> {
  let message
  if (!param) {
    message = func
  } else {
    message = `${func}() requires at least ${param} as its first parameter.`
  }
  console.warn(message) // eslint-disable-line no-console
  return Promise.reject(message)
}

/**
 *
 */
class SyncStorage {
  data: Map<string, string> = new Map()

  loading = true

  async init(): Promise<void> {
    await AsyncStorage.getAllKeys().then((keys: string[]) =>
      AsyncStorage.multiGet(keys).then((data: any): any[] => {
        data.forEach(this.saveItem.bind(this))

        return [...this.data]
      }),
    )

  }

  getItem(key: string): string | undefined {
    return this.data.get(key)
  }

  setItem(key: string, value: any): Promise<any> {
    if (!key) return handleError('set', 'a key')

    this.data.set(key, value)
    return AsyncStorage.setItem(key, JSON.stringify(value))
  }

  removeItem(key: string): Promise<any> {
    if (!key) return handleError('remove', 'a key')

    this.data.delete(key)
    return AsyncStorage.removeItem(key)
  }

  clear(): void {
    AsyncStorage.clear()
  }

  getAllKeys(): string[] {
    return Array.from(this.data.keys())
  }

  saveItem(item: string[]) {
    let value

    try {
      value = JSON.parse(item[1])
    } catch (e) {
      [, value] = item
    }

    this.data.set(item[0], value)
    this.loading = false
  }
}

// eslint-disable-next-line export-default-identifier/export-default-identifier
export default new SyncStorage()
