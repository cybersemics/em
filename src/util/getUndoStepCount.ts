import Patch from '../@types/Patch'
import { isUndoable } from './actionMetadata.registry'

/** Formatting held for an empty thought gives it no value, so it is never grouped with the thought's creation. It is the
 * only formatSelection patch that touches a pendingFormat. Editor overlays are restored atomically, so the first
 * held format's inverse patch removes the entire thoughtUi entry instead of naming its pendingFormat field. */
const isPendingFormat = (patch: Patch | undefined) =>
  !!patch?.metadata.actionTypes.includes('formatSelection') &&
  patch.ops.some(op => op.path.endsWith('/pendingFormat') || /^\/thoughtUi\/[^/]+$/.test(op.path))

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
      ? !!patch &&
        (patch.metadata.isNavigation || (patch.metadata.actionTypes[0] === 'newThought' && !isPendingFormat(adjacent)))
      : !!patch &&
        !!adjacent &&
        (patch.metadata.isNavigation
          ? adjacent.metadata.actionTypes.some(isUndoable)
          : adjacent.metadata.actionTypes[0] === 'newThought' && !isFormatting && !isPendingFormat(patch))
  return grouped ? 2 : 1
}

export default getUndoStepCount
