import ShortcutId from '../@types/ShortcutId'
import storage from '../util/storage'

const storageModel = storage.model({
  fontSize: {
    default: 18,
    decode: (s: string | null) => (s ? +s : undefined),
  },
  // recent commands executed from the command palette
  recentCommands: {
    default: [] as ShortcutId[],
  },
})

export default storageModel
