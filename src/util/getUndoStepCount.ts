import Patch from '../@types/Patch'

/** Determines a history step's size from action semantics. Undo and the slider traverse newest first; Redo traverses
 * forward and attaches navigation to the following patch. The slider preserves its existing structural grouping of
 * formatting with a new thought; keyboard Undo supplies the live formatting classification to keep it separate. */
const getUndoStepCount = (
  patch: Patch | undefined,
  adjacent: Patch | undefined,
  { direction = 'undo', isFormatting = false }: { direction?: 'undo' | 'redo'; isFormatting?: boolean } = {},
): number => {
  const grouped =
    direction === 'redo'
      ? !!patch && (patch.metadata.isNavigation || patch.metadata.actionTypes[0] === 'newThought')
      : !!patch &&
        !!adjacent &&
        (patch.metadata.isNavigation
          ? !adjacent.metadata.isNavigation
          : adjacent.metadata.actionTypes[0] === 'newThought' && !isFormatting)
  return grouped ? 2 : 1
}

export default getUndoStepCount
