import CommandId from '../@types/CommandId'
import Path from '../@types/Path'
import storage from '../util/storage'

type BackgroundGlowStorageType = { image: string | null; opacity: number }

type CursorStorageType = { path: Path | null; offset: number | null }

const storageModel = storage.model({
  // debug background glow overlay behind the thoughtspace (see BackgroundGlow)
  backgroundGlow: {
    default: { image: null, opacity: 0.6 } as BackgroundGlowStorageType,
    // spread over the defaults so values stored before a field was added fall back to that field's default
    decode: (s: string | null): BackgroundGlowStorageType => ({
      image: null,
      opacity: 0.6,
      ...(s ? (JSON.parse(s) as Partial<BackgroundGlowStorageType>) : null),
    }),
    encode: (value: BackgroundGlowStorageType) => JSON.stringify(value),
  },
  cursor: {
    default: { path: null, offset: null } as CursorStorageType,
    decode: (s: string | null): CursorStorageType =>
      s ? (JSON.parse(s) as CursorStorageType) : { path: null, offset: null },
    encode: (value: CursorStorageType) => JSON.stringify(value),
  },
  fontSize: {
    default: 18,
    decode: (s: string | null) => (s ? +s : undefined),
  },
  jumpHistory: {
    default: [] as (Path | null)[],
    decode: (s: string | null): Path[] => (s ? (JSON.parse(s) as Path[]) : []),
    encode: value => JSON.stringify(value),
  },
  // recent commands executed from the desktop command universe
  recentCommands: {
    default: [] as CommandId[],
  },
})

export default storageModel
