import Path from '../@types/Path'
import ShortcutId from '../@types/ShortcutId'
import storage from '../util/storage'

const storageModel = storage.model({
  cursor: {
    default: { path: null, offset: null },
    decode: (s: string | null) => (s ? JSON.parse(s) : null),
    encode: (value: { path: Path | null; offset: number | null }) => JSON.stringify(value),
  },
  fontSize: {
    default: 18,
    decode: (s: string | null) => (s ? +s : undefined),
  },
  jumpHistory: {
    default: [] as (Path | null)[],
    decode: (s: string | null): Path[] => (s ? JSON.parse(s) : []),
    encode: value => JSON.stringify(value),
  },
  // recent commands executed from the command palette
  recentCommands: {
    default: [] as ShortcutId[],
  },
})

export default storageModel
