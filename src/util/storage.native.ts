import AsyncStorage from '@react-native-async-storage/async-storage'

const storage = {
  async clear(): Promise<void> {
    await AsyncStorage.clear()
  },

  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key)
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
  },

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value)
  },
}

export { storage }
