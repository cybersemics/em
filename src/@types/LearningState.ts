import CommandId from './CommandId'

/** Practice progress for one command. Completion is derived as `reps >= targetReps`; there is no separate learned flag. */
export interface CommandLearningProgress {
  /** Verified practice repetitions so far, capped at targetReps. */
  reps: number
  /** The repetition target captured when the record was created. Changing the default does not change existing records. */
  targetReps: number
}

/**
 * The learning journey state: which command is pinned to the corner widget, and sparse practice progress keyed by
 * stable CommandId. A missing progress record means the command has not been started. Held in memory only; there is
 * no persistence boundary yet, so this state does not survive a reload.
 */
interface LearningState {
  pinnedCommandId: CommandId | null
  progress: Partial<Record<CommandId, CommandLearningProgress>>
}

export default LearningState
