import { head } from 'lodash'
import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { errorActionCreator } from '../actions/error'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { splitThoughtActionCreator } from '../actions/splitThought'
import { isSafari, isTouch } from '../browser'
import Icon from '../components/icons/NewThoughtIcon'
import asyncFocus from '../device/asyncFocus'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import isContextViewActive from '../selectors/isContextViewActive'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import ellipsize from '../util/ellipsize'
import isDocumentEditable from '../util/isDocumentEditable'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e, { type }: { type: string }) => {
  const state = getState()
  const { cursor } = state

  // create a new thought
  const splitResult = cursor ? selection.split(e.target as HTMLElement) : null

  const showContexts = cursor && isContextViewActive(state, rootedParentOf(state, cursor))

  // split the thought at the selection
  // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
  const split =
    type === 'keyboard' &&
    cursor &&
    !showContexts &&
    editingValueStore.getState() &&
    splitResult &&
    splitResult.left.length > 0 &&
    splitResult.right.length > 0 &&
    splitResult.left.length < (editingValueStore.getState() ?? '').length

  // prevent split on gesture
  if (split) {
    const thought = cursor && pathToThought(state, cursor)

    // Determine if thought at path is uneditable
    const uneditable = cursor && findDescendant(state, head(cursor) ?? null, '=uneditable')

    if (isTouch && !uneditable && isSafari()) {
      asyncFocus()
    }

    dispatch(
      thought && uneditable
        ? errorActionCreator({ value: `"${ellipsize(thought?.value)}" is uneditable and cannot be split.` })
        : splitThoughtActionCreator({ splitResult }),
    )
  } else {
    dispatch(newThought({ value: '' }))
  }
}

const newThoughtShortcut: Shortcut = {
  id: 'newThought',
  label: 'New Thought',
  description: 'Create a shiny new thought.',
  keyboard: { key: Key.Enter },
  gesture: 'rd',
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newThoughtAliases: Shortcut = {
  id: 'newThoughtAliases',
  label: 'New Thought',
  hideFromHelp: true,
  gesture: ['rdld', 'rdldl', 'rdldld', 'rldl', 'rldld', 'rldldl'],
  // on mobile, the shift key should cause a normal newThought, not newThoughtAbove
  // smuggle it in with the aliases
  ...(isTouch ? { keyboard: { key: Key.Enter, shift: true } } : null),
  canExecute: () => isDocumentEditable(),
  exec,
}

export default newThoughtShortcut
