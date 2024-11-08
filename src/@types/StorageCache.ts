import ShortcutId from './ShortcutId'

interface StorageCache {
  theme?: 'Dark' | 'Light'
  tutorialComplete?: boolean
  tutorialStep?: number
  userToolbar?: ShortcutId[]
}

export default StorageCache
