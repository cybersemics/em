import Path from '../@types/Path'
import ShortcutId from '../@types/ShortcutId'
import storage from '../util/storage'

const storageModel = storage.model({
  cursor: {
    decode: (s: string | null) => (s ? JSON.parse(s) : null),
    encode: (value: Path | null) => JSON.stringify(value),
  },
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
