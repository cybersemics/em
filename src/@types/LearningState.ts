import CommandId from './CommandId'

/** Practice reps for the pinned command. Reaching `targetReps` fills the ring and marks the command learned. */
export interface CommandLearningProgress {
  /** Successful keyboard or gesture repetitions since the command was pinned. Not capped: reps past targetReps keep counting and each plays the ring's flourish. */
  reps: number
  /** The repetition target captured when the record was created. Changing the default does not change existing records. */
  targetReps: number
}

/**
 * The learning journey state: which command is pinned to the corner widget, its practice record keyed by stable
 * CommandId, and which commands the user has discovered and learned. Progress exists only for the pinned command;
 * unpinning or pinning another command erases it. Saved on this device so it survives a reload.
 *
 * A command is in one of three states. Undiscovered: the user has no recorded deliberate encounter with it.
 * Discovered: they have met it, by revealing it in the Gesture Menu, opening its Command Universe detail page, pinning
 * it, or performing it. Learned: they have filled its practice ring. A learned command stays in `discovered`.
 */
interface LearningState {
  pinnedCommandId: CommandId | null
  progress: Partial<Record<CommandId, CommandLearningProgress>>
  /** The commands the user has discovered. The Gesture Menu lists only these. Starts as LEARNING_STARTER_COMMANDS. */
  discovered: CommandId[]
  /** The commands the user has learned: those whose practice ring they have filled. */
  learned: CommandId[]
}

export default LearningState
