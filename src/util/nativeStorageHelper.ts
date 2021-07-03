/* eslint-disable fp/no-class */
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Class SyncStorage - used to made async store sync an
 * prevent changing to async call the whole app.
 */
class SyncStorage {
  data: Map<string, string> = new Map()

  loading = true

  async init(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys()
    const data = (await AsyncStorage.multiGet(keys)) as string[][]
    data.forEach(this.saveItem.bind(this))
  }

  getItem(key: string): string | undefined {
    return this.data.get(key)
  }

  setItem(key: string, value: any): Promise<any> {
    if (!key) throw new Error('set key')

    this.data.set(key, value)
    return AsyncStorage.setItem(key, JSON.stringify(value))
  }

  removeItem(key: string): Promise<any> {
    if (!key) throw new Error('remove key')

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
      ;[, value] = item
    }

    this.data.set(item[0], value)
    this.loading = false
  }
}

const syncStorage = new SyncStorage()

export default syncStorage
