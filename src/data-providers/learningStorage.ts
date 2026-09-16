import LearningState from '../@types/LearningState'
import storage from '../util/storage'

const key = 'learning:v1'

/** Loads device-local learning state, dropping invalid or removed command records. */
const load = (commandIds: ReadonlySet<string>): LearningState | null => {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const { pinnedCommandId, progress } = parsed as Record<string, unknown>
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return null

    const validProgress = Object.fromEntries(
      Object.entries(progress).filter(([commandId, record]) => {
        if (!commandIds.has(commandId) || !record || typeof record !== 'object') return false
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
    ) as LearningState['progress']

    return {
      pinnedCommandId:
        typeof pinnedCommandId === 'string' && commandIds.has(pinnedCommandId)
          ? (pinnedCommandId as LearningState['pinnedCommandId'])
          : null,
      progress: validProgress,
    }
  } catch (error) {
    console.warn('Could not load learning progress.', error)
    return null
  }
}

/** Saves learning state on this device, independently of the active thoughtspace. */
const save = (learning: LearningState): void => {
  try {
    storage.setItem(key, JSON.stringify(learning))
  } catch (error) {
    console.warn('Could not save learning progress.', error)
  }
}

export default { load, save }
