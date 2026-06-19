import CommandId from '../@types/CommandId'
import Path from '../@types/Path'
import storage from '../util/storage'

type CursorStorageType = { path: Path | null; offset: number | null }

const storageModel = storage.model({
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
  /** The settled height of the iOS Safari virtual keyboard in landscape orientation, learned when the keyboard closes. Lets iOSSafariHandler predict the keyboard's final height at open detection — before it can be measured — across page reloads. */
  virtualKeyboardHeightLandscape: {
    default: 0,
    decode: (s: string | null) => (s ? +s : undefined),
  },
  /** The settled height of the iOS Safari virtual keyboard in portrait orientation. See virtualKeyboardHeightLandscape. */
  virtualKeyboardHeightPortrait: {
    default: 0,
    decode: (s: string | null) => (s ? +s : undefined),
  },
})

export default storageModel
