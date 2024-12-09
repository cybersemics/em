import CommandId from './CommandId'

interface StorageCache {
  theme?: 'Dark' | 'Light'
  tutorialComplete?: boolean
  tutorialStep?: number
  userToolbar?: CommandId[]
}

export default StorageCache
