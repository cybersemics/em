import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import findDescendant from '../selectors/findDescendant'
import { anyChild, findAnyChild } from '../selectors/getChildren'
import getRankAfter from '../selectors/getRankAfter'
import getThoughtById from '../selectors/getThoughtById'
import parentContextPath from '../selectors/parentContextPath'
import pathToThought from '../selectors/pathToThought'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headId from '../util/headId'
import headValue from '../util/headValue'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'
import normalizeThought from '../util/normalizeThought'
import parentOf from '../util/parentOf'
import { isContextStep } from '../util/pathStep'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'
import newThought from './newThought'
import setCursor from './setCursor'
import uncategorize from './uncategorize'

/** Increases the indentation level of the thought, i.e. Moves it to the end of its previous sibling. */
const swapNote = (state: State): State => {
  const { cursor } = state

  if (!cursor) return state

  // The cursor thought is converted to or from a note by moving it, so it is the Lexeme context the path lands on.
  // A context in the context view is rejected below, so the two agree here.
  const thoughtId = headId(cursor)
  // =note belongs to the thought the user sees, which in the context view is the context rather than the Lexeme
  // Lexeme context (see resolveNotePath). Resolving the parent once keeps the lookups and the =note that is created in the
  // same context, and gives moveThought a destination it can resolve.
  const parentPath = parentContextPath(state, parentOf(cursor))
  const parentNoteId = findDescendant(state, head(parentPath), '=note')
  const parentNoteChildId = anyChild(state, parentNoteId)?.id
  const noteId = findDescendant(state, thoughtId, '=note')

  // cancel if cursor is the em or home contexts
  if (isEM(cursor) || isRoot(cursor)) {
    return alert(state, { value: `The "${isEM(cursor) ? 'em' : 'home'}" context cannot be converted to a note.` })
  }
  // cancel if cursor is in the home context
  if (!noteId && cursor.length < 2) {
    return alert(state, { value: `Thoughts in the home context cannot be converted to a note.` })
  }
  // cancel if parent is readonly or unextendable
  else if (findDescendant(state, head(parentPath), '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" is read-only so "${headValue(
        state,
        cursor,
      )}" cannot be converted to a note.`,
    })
  } else if (findDescendant(state, head(parentPath), '=uneditable')) {
    return alert(state, {
      value: `"${ellipsize(headValue(state, parentOf(cursor)) ?? 'MISSING_THOUGHT')}" is unextendable so "${headValue(
        state,
        cursor,
      )}" cannot be converted to a note.`,
    })
  } else if (isContextStep(head(cursor))) {
    return alert(state, {
      value: `A context in the context view cannot be converted to a note.`,
    })
  } else if (cursor.length > 1 && isContextStep(head(parentOf(cursor) as Path))) {
    // The note belongs to the thought the parent row displays (the context), but the cursor is a child of the Lexeme
    // Lexeme context the row stands for. There is no coherent thought to swap between, so refuse rather than guess.
    return alert(state, {
      value: `A subthought of a context in the context view cannot be converted to a note.`,
    })
  }

  // Capture the cursor thought's value before uncategorize may delete it (when it has children)
  const value = headValue(state, cursor) ?? ''
  const simplePath = simplifyPath(state, cursor)

  return reducerFlow(
    // if the cursor thought has a note, then convert the note to a thought
    noteId
      ? // move =note's child to the parent
        [
          state => {
            const noteChildId = anyChild(state, noteId)!.id
            const oldPath = appendToPath(cursor, noteId, noteChildId)
            const newPath = appendToPath(cursor, noteChildId)
            const newRank = getRankAfter(state, appendToPath(simplePath, noteId))
            const note = pathToThought(state, oldPath)

            return note
              ? reducerFlow([
                  moveThought({ oldPath, newPath, newRank }),
                  // delete =note
                  deleteThought({
                    pathParent: cursor,
                    thoughtId: noteId,
                  }),
                  // Set the cursor on the converted thought. If a sibling with the same value
                  // already existed, moveThought merged the note child into it and noteChildId
                  // no longer exists, so resolve the surviving thought by value to avoid an
                  // "Invalid path... No thought found with id" error.
                  state => {
                    const resultChild = getThoughtById(state, noteChildId)
                      ? getThoughtById(state, noteChildId)
                      : findAnyChild(
                          state,
                          thoughtId,
                          child => normalizeThought(child.value) === normalizeThought(note.value),
                        )
                    return resultChild
                      ? setCursor(state, {
                          offset: resultChild.value.length,
                          path: appendToPath(cursor, resultChild.id),
                        })
                      : state
                  },
                ])(state)
              : null
          },
        ]
      : // if the cursor thought does not have a note, swap it with its parent's note (or create a note if one does not exist)
        [
          // create =note in thn cursor's parent if one does not exist
          !parentNoteId
            ? newThought({
                at: parentPath,
                insertBefore: true,
                insertNewSubthought: true,
                preventSetCursor: true,
                value: '=note',
              })
            : null,
          // move the existing =note child into the parent if it exists
          state => {
            return parentNoteChildId
              ? moveThought(state, {
                  oldPath: appendToPath(
                    parentPath,
                    findDescendant(state, head(parentPath), '=note')!,
                    parentNoteChildId,
                  ),
                  newPath: appendToPath(parentPath, parentNoteChildId),
                  newRank: getRankAfter(state, simplePath),
                })
              : null
          },
          // use uncategorize to move the cursor's children to the parent
          // uncategorize is a no-op when there are no children, so this is safe in all cases
          uncategorize({ at: simplePath }),
          // if the cursor thought still exists (had no children), move it into =note
          // if uncategorize deleted it (had children), recreate it under =note with the original value
          state => {
            const noteId = findDescendant(state, head(parentPath), '=note')!
            return getThoughtById(state, thoughtId)
              ? moveThought(state, {
                  oldPath: cursor,
                  newPath: appendToPath(parentPath, noteId, thoughtId),
                  newRank: 0,
                })
              : newThought(state, {
                  at: appendToPath(parentPath, noteId),
                  insertNewSubthought: true,
                  preventSetCursor: true,
                  value: value,
                })
          },
          setCursor({ path: parentNoteChildId ? appendToPath(parentOf(cursor), parentNoteChildId) : parentOf(cursor) }),
        ],
  )(state)
}

/** Action-creator for swapNote. */
export const swapNoteActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapNote' })

export default swapNote

// Register this action's metadata
registerActionMetadata('swapNote', {
  undoable: true,
})
