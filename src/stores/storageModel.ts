import CommandId from '../@types/CommandId'
import LearningState from '../@types/LearningState'
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
  learning: {
    default: { pinnedCommandId: null, progress: {} } as LearningState,
    // Validate structure without importing the command registry, which depends on the app store.
    // Consumers resolve saved IDs against the current registry and ignore unavailable commands.
    decode: (s: string | null): LearningState => {
      try {
        const parsed: unknown = s ? JSON.parse(s) : null
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          return { pinnedCommandId: null, progress: {} }
        const { pinnedCommandId, progress } = parsed as Record<string, unknown>
        if (!progress || typeof progress !== 'object' || Array.isArray(progress))
          return { pinnedCommandId: null, progress: {} }

        return {
          pinnedCommandId: typeof pinnedCommandId === 'string' ? (pinnedCommandId as CommandId) : null,
          progress: Object.fromEntries(
            Object.entries(progress).filter(([, record]) => {
              if (!record || typeof record !== 'object' || Array.isArray(record)) return false
              const { reps, targetReps } = record as Record<string, unknown>
              return (
                typeof reps === 'number' &&
                Number.isInteger(reps) &&
                reps >= 0 &&
                typeof targetReps === 'number' &&
                Number.isInteger(targetReps) &&
                targetReps > 0
              )
            }),
          ) as LearningState['progress'],
        }
      } catch (error) {
        console.warn('Could not load learning progress.', error)
        return { pinnedCommandId: null, progress: {} }
      }
    },
    encode: (value: LearningState) => JSON.stringify(value),
  },
  // recent commands executed from the desktop command universe
  recentCommands: {
    default: [] as CommandId[],
  },
})

export default storageModel
