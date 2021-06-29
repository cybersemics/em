import _ from 'lodash'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { IStorage } from '../types'

let storage: IStorage = {
  async clear(): Promise<void> {
    await AsyncStorage.clear()
  },

  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key)
  },

  async removeItem(key: string): Promise<void> {
    storage = _.omit(storage, key)
    await AsyncStorage.removeItem(key)
  },

  async setItem(key: string, value: string): Promise<void> {
    storage[`${key}`] = value
    await AsyncStorage.setItem(key, value)
  },
}

export { storage }
