import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import SplitResult from '../@types/SplitResult'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import setCursor from '../actions/setCursor'
import tutorialNext from '../actions/tutorialNext'
import tutorialStepReducer from '../actions/tutorialStep'
import { isSafari, isTouch } from '../browser'
import {
  ABSOLUTE_PATH,
  ABSOLUTE_TOKEN,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUBTHOUGHT,
} from '../constants'
import asyncFocus from '../device/asyncFocus'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import findDescendant from '../selectors/findDescendant'
import { getChildrenSorted } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import getPrevRank from '../selectors/getPrevRank'
import getRankAfter from '../selectors/getRankAfter'
import getRankBefore from '../selectors/getRankBefore'
import getRootPath from '../selectors/getRootPath'
import getSetting from '../selectors/getSetting'
import getSortPreference from '../selectors/getSortPreference'
import getSortedRank from '../selectors/getSortedRank'
import isContextViewActive from '../selectors/isContextViewActive'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import editingValueStore from '../stores/editingValue'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isRoot from '../util/isRoot'
import once from '../util/once'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'

export interface NewThoughtPayload {
  /** The Path which the new thought is inserted after, unless insertBefore or insertNewSubthought are specified. */
  at?: Path
  /** Callback for when the updates have been synced with IDB. */
  idbSynced?: () => void
  insertNewSubthought?: boolean
  insertBefore?: boolean
  value?: string
  offset?: number
  aboveMeta?: boolean
  preventSetCursor?: boolean
  splitSource?: ThoughtId
}

/** Adds a new thought to the cursor. Calculates the rank to add the new thought above, below, or within a thought.
 *
 * @param offset The focusOffset of the selection in the new thought. Defaults to end.
 */
const newThought = (state: State, payload: NewThoughtPayload | string) => {
  // optionally allow string value to be passed as entire payload
  if (typeof payload === 'string') {
    payload = { value: payload }
  }

  const {
    at,
    idbSynced,
    insertNewSubthought,
    insertBefore,
    value = '',
    offset,
    preventSetCursor,
    aboveMeta,
    splitSource,
  }: NewThoughtPayload = payload

  const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)
  const tutorialStepNewThoughtCompleted =
    // new thought
    (!insertNewSubthought &&
      (Math.floor(tutorialStep) === TUTORIAL_STEP_FIRSTTHOUGHT ||
        Math.floor(tutorialStep) === TUTORIAL_STEP_SECONDTHOUGHT)) ||
    // new thought in context
    (insertNewSubthought && Math.floor(tutorialStep) === TUTORIAL_STEP_SUBTHOUGHT) ||
    // enter after typing text
    (state.cursor &&
      headValue(state, state.cursor).length > 0 &&
      (tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER || tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER))

  const path = at || state.cursor || getRootPath(state)

  const simplePath = simplifyPath(state, path)

  const parentPath = rootedParentOf(state, simplePath)
  const insertPath = insertNewSubthought ? simplePath : parentPath
  const insertId = head(insertPath)

  // TODO: Disable =readonly during resumable import.
  // prevent adding Subthought to readonly or unextendable Thought
  // const parentId = head(parentPath)
  // const sourceId = insertNewSubthought ? thoughtId : parentId
  // const sourceThought = getThoughtById(state, sourceId)
  // if (findDescendant(state, sourceId, '=readonly')) {
  //   return alert(state, {
  //     value: `"${ellipsize(sourceThought.value)}" is read-only. No subthoughts may be added.`,
  //   })
  // } else if (findDescendant(state, sourceId, '=unextendable')) {
  //   return alert(state, {
  //     value: `"${ellipsize(sourceThought.value)}" is unextendable. No subthoughts may be added.`,
  //   })
  // }

  const showContexts = isContextViewActive(state, path)
  const showContextsParent = isContextViewActive(state, rootedParentOf(state, path))
  const insertContext = (showContextsParent && !insertNewSubthought) || (showContexts && insertNewSubthought)

  /** Gets the Path of the last visible child in a SimplePath if it is a sorted context. */
  const getLastSortedChildPath = once((): SimplePath | null => {
    const lastChild = _.last(getChildrenSorted(state, head(simplePath)))
    return lastChild ? appendToPath(simplePath, lastChild.id) : null
  })

  // if meta key is pressed, add a child instead of a sibling of the current thought
  // if shift key is pressed, insert the child before the current thought
  const newRank = insertContext
    ? getNextRank(state, ABSOLUTE_TOKEN)
    : value !== '' && getSortPreference(state, insertId).type === 'Alphabetical'
      ? getSortedRank(state, insertId, value)
      : insertBefore
        ? insertNewSubthought || !simplePath || isRoot(simplePath)
          ? getPrevRank(state, insertId, { aboveMeta })
          : getRankBefore(state, simplePath)
        : insertNewSubthought || !simplePath
          ? // if inserting an empty thought into a sorted context via insertNewSubthought, get the rank after the last sorted child rather than incrementing the highest rank
            // otherwise the empty thought will not be correctly sorted by resortEmptyInPlace
            value === '' && getSortPreference(state, insertId).type === 'Alphabetical' && getLastSortedChildPath()
            ? getRankAfter(state, getLastSortedChildPath()!)
            : getNextRank(state, insertId)
          : getRankAfter(state, simplePath)

  // when creating a new context in a context view, newThoughtId is the new empty thought (a/~m/_), and newContextId is the newly added Lexeme context (/ABS/_/m)
  const newThoughtId = createId()
  const newContextId = insertContext ? createId() : null

  const reducers = [
    // createThought
    createThought({
      ...(insertContext ? { children: [newContextId!] } : null),
      path: insertContext ? ABSOLUTE_PATH : insertNewSubthought ? simplePath : parentPath,
      rank: newRank,
      value,
      id: newThoughtId,
      idbSynced,
      splitSource,
    }),

    // if adding a new context to the context view, add the thought to the new context
    insertContext
      ? createThought({
          path: [ABSOLUTE_TOKEN, newThoughtId] as unknown as SimplePath,
          rank: 0,
          value: headValue(state, insertNewSubthought ? path : parentOf(path)),
          id: newContextId!,
          splitSource,
        })
      : null,

    // setCursor
    (newState: State) => {
      const parentPath = !preventSetCursor ? unroot(insertNewSubthought ? path : parentOf(path)) : null

      return !preventSetCursor
        ? setCursor(newState, {
            editing: true,
            path: unroot([...parentPath!, newThoughtId]),
            offset: offset != null ? offset : getTextContentFromHTML(value).length,
          })
        : null
    },

    // tutorial step 1
    tutorialStepNewThoughtCompleted
      ? tutorialNext({})
      : // some hints are rolled back when a new thought is created
        tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT
        ? tutorialStepReducer({ value: TUTORIAL2_STEP_CONTEXT1_PARENT })
        : tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT
          ? tutorialStepReducer({ value: TUTORIAL2_STEP_CONTEXT1 })
          : tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT
            ? tutorialStepReducer({ value: TUTORIAL2_STEP_CONTEXT2_PARENT })
            : tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT
              ? tutorialStepReducer({ value: TUTORIAL2_STEP_CONTEXT2 })
              : null,
  ]

  return reducerFlow(reducers)(state)
}

/**
 * Creates a new thought.
 *
 * @param offset - Cursor offset.
 * @param preventSplit - Set to true to prevent splitting thought.
 */
export const newThoughtActionCreator =
  ({
    at,
    idbSynced,
    insertBefore,
    insertNewSubthought,
    splitResult,
    preventSetCursor,
    preventSplit,
    value = '',
  }: {
    at?: Path
    /** Callback for when the updates have been synced with IDB. */
    idbSynced?: () => void
    insertBefore?: boolean
    insertNewSubthought?: boolean
    splitResult?: SplitResult | null
    preventSetCursor?: boolean
    preventSplit?: boolean
    value?: string
  }): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    const tutorial = getSetting(state, 'Tutorial') !== 'Off'
    const tutorialStep = +!getSetting(state, 'Tutorial Step')

    const path = at || cursor

    const thought = path && pathToThought(state, path)

    // cancel if tutorial has just started
    if (tutorial && tutorialStep === TUTORIAL_STEP_START) return

    // Determine if thought at path is uneditable
    const uneditable = path && findDescendant(state, head(path), '=uneditable')

    const showContexts = path && isContextViewActive(state, rootedParentOf(state, path))

    // split the thought at the selection
    // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
    // do not split with gesture, as Enter is avialable and separate in the context of mobile
    const split =
      !preventSplit &&
      path &&
      !showContexts &&
      !value &&
      editingValueStore.getState() &&
      splitResult &&
      splitResult.left.length > 0 &&
      splitResult.right.length > 0 &&
      splitResult.left.length < (editingValueStore.getState() ?? '').length

    if (!preventSetCursor && isTouch && (!split || !uneditable) && isSafari()) {
      asyncFocus()
    }

    if (split) {
      dispatch(
        uneditable && path && thought
          ? { type: 'error', value: `"${ellipsize(thought?.value)}" is uneditable and cannot be split.` }
          : { type: 'splitThought', splitResult },
      )
      return
    }

    dispatch({
      type: 'newThought',
      at: path,
      idbSynced,
      insertBefore,
      insertNewSubthought,
      preventSetCursor,
      value,
    })
  }

export default _.curryRight(newThought)
