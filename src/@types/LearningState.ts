import CommandId from './CommandId'

/** Practice reps for the pinned command. Reaching `targetReps` fills the ring; nothing is marked learned. */
export interface CommandLearningProgress {
  /** Successful keyboard or gesture repetitions since the command was pinned. Not capped: reps past targetReps keep counting and each plays the ring's flourish. */
  reps: number
  /** The repetition target captured when the record was created. Changing the default does not change existing records. */
  targetReps: number
}

/**
 * The learning journey state: which command is pinned to the corner widget, and its practice record keyed by stable
 * CommandId. Progress exists only for the pinned command; unpinning or pinning another command erases it. Saved on
 * this device so the pin and its reps survive a reload.
 */
interface LearningState {
  pinnedCommandId: CommandId | null
  progress: Partial<Record<CommandId, CommandLearningProgress>>
}

export default LearningState
