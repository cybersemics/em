import _ from 'lodash'
import { IStorage } from '../types'

let storage: IStorage = {
  clear(): void {
    localStorage.clear()
  },

  getItem(key: string): string | null {
    return localStorage.getItem(key)
  },

  removeItem(key: string): void {
    storage = _.omit(storage, key)
    localStorage.removeItem(key)
  },

  setItem(key: string, value: string): void {
    storage[`${key}`] = value
    localStorage.setItem(key, value)
  },
}

export { storage }
