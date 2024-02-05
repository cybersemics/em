import Path from '../@types/Path'
import SplitResult from '../@types/SplitResult'
import Thunk from '../@types/Thunk'
import { isSafari, isTouch } from '../browser'
import { TUTORIAL_STEP_START } from '../constants'
import asyncFocus from '../device/asyncFocus'
import findDescendant from '../selectors/findDescendant'
import getSetting from '../selectors/getSetting'
import isContextViewActive from '../selectors/isContextViewActive'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import ellipsize from '../util/ellipsize'
import head from '../util/head'

/**
 * Creates a new thought.
 *
 * @param offset - Cursor offset.
 * @param preventSplit - Set to true to prevent splitting thought.
 */
const newThought =
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

export default newThought
