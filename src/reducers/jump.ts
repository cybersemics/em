import { applyPatch } from 'fast-json-patch'
import produce from 'immer'
import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import setCursor from './setCursor'

/** Finds the last edit in the undo history and rebuilds the cursor at that point. Skips unchanged cursor and thoughts that no longer exist. */
const lastEdit = (state: State, indexStart = 0) => {
  let cursorAccum = state.cursor
  let editOperation

  // traverse backwards through the undo history until an edit is found
  // apply cursor patches along the way to get the cursor at the edit point
  // eslint-disable-next-line fp/no-loops
  for (let i = indexStart; i < state.undoPatches.length; i++) {
    const patch = state.undoPatches[state.undoPatches.length - 1 - i]

    // create a new patch that just contains cursor updates
    const cursorPatch = patch
      .filter(op => op.path === '/cursor' || op.path.startsWith('/cursor/'))
      // undo patch is relative to the entire State, so we need to remove /cursor for the patch to apply directly to a cursor object
      .map(op => ({ ...op, path: op.path.slice('/cursor'.length) }))

    if (cursorPatch.length > 0) {
      // the cursor patch is only a diff, so we need to apply the patch to the accumulated cursor at each step
      cursorAccum = produce(
        // applyPatch requires a non-null destination object
        // assume that the operations start with /cursor/0 and pass an empty array
        cursorAccum || ([] as unknown as Path),
        cursorDraft => applyPatch(cursorDraft, cursorPatch).newDocument,
      )
    }

    if (!editOperation) {
      editOperation = patch.find(op => op.path.startsWith('/thoughts'))
    }

    if (
      editOperation &&
      (!cursorAccum || getThoughtById(state, head(cursorAccum))) &&
      head(cursorAccum || []) !== head(state.cursor || [])
    ) {
      return { cursor: cursorAccum, index: i + 1 }
    }
  }

  return { cursor: state.cursor, index: 0 }
}

/** Move the cursor back to the nth last edit point. */
const jump = (state: State, { steps }: { steps: number } = { steps: 1 }): State => {
  // If there have been no edits since the last jump, use the jump cursor instead of the last edit point
  // See: State.jump
  if (state.jumpCursor) {
    return setCursor(state, { path: state.jumpCursor, setJumpCursor: false })
  }

  let result = { cursor: state.cursor, index: 0 }

  // eslint-disable-next-line fp/no-loops
  for (let i = 0; i < steps; i++) {
    result = lastEdit(state, result.index)
  }

  return setCursor(state, { path: result.cursor, setJumpCursor: true })
}

export default jump
