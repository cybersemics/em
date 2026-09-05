import moize from 'moize'
import Patch from '../@types/Patch'
import State from '../@types/State'

/** A step of the undo history: the patches that are undone and redone together, in chronological order. */
export interface UndoStep {
  patches: Patch[]
}

/** Returns the command or action id that produced a patch. */
const patchSourceId = (patch: Patch): string =>
  patch.metadata.source === 'command' ? patch.metadata.commandId : patch.metadata.actionType

/** Groups patches, ordered newest first, into undo steps. Mirrors undoTwice in undoRedoEnhancer: a navigation patch is grouped with the undoable patch before it, and a patch that follows a newThought is grouped with it, e.g. typing the value of a new thought. Unlike undoReducer, a formatting-only edit of a newly created thought is also grouped with the newThought, since telling it apart would require the thought's value at that point in the history. */
const groupSteps = (patches: Patch[]): UndoStep[] =>
  patches.reduce<UndoStep[]>((steps, patch, i) => {
    // skip a patch that was grouped with the newer patch before it
    if (steps.at(-1)?.patches[0] === patch) return steps
    const older = patches[i + 1]
    const grouped =
      !!older && (patch.metadata.isNavigation ? !older.metadata.isNavigation : patchSourceId(older) === 'newThought')
    return [...steps, { patches: grouped ? [older, patch] : [patch] }]
  }, [])

/** Returns the steps of the undo history, newest first, spanning the redo stack (the steps ahead of the current state) and the undo stack. The position is the index of the current state in the steps, i.e. the number of steps that have been undone. The steps on either side of the current state are grouped separately, so the current state always sits on a step boundary. */
const undoSteps = (state: State): { steps: UndoStep[]; position: number } => {
  // redoPatches[0] is the oldest action that was undone, i.e. the newest in the history
  const redoSteps = groupSteps(state.redoPatches)
  return {
    steps: [...redoSteps, ...groupSteps([...state.undoPatches].reverse())],
    position: redoSteps.length,
  }
}

/** Memoize undoSteps by the undo and redo stacks, so that components re-render only when the history changes. */
const undoStepsMemoized = moize(undoSteps, {
  maxSize: 1,
  transformArgs: ([state]) => [state.undoPatches, state.redoPatches],
})

export default undoStepsMemoized
