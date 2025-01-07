import { head } from 'lodash'
import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import SplitResult from '../@types/SplitResult'
import State from '../@types/State'
import { errorActionCreator } from '../actions/error'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { splitThoughtActionCreator as splitThought } from '../actions/splitThought'
import { isTouch } from '../browser'
import Icon from '../components/icons/NewThoughtIcon'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import isContextViewActive from '../selectors/isContextViewActive'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import ellipsize from '../util/ellipsize'
import isDocumentEditable from '../util/isDocumentEditable'

/** A selector that splits the cursor and returns a SplitResult. This function first checks that a split is allowed (i.e. cursor is non-empty, context view is not activated, etc), and returns null if not allowed. */
const split = (state: State, el: HTMLElement): SplitResult | null => {
  const { cursor } = state

  if (!cursor || isContextViewActive(state, rootedParentOf(state, cursor)) || !editingValueStore.getState()) return null

  const splitResult = cursor ? selection.split(el) : null

  // split the thought at the selection
  // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
  const canSplit =
    splitResult &&
    splitResult.left.length > 0 &&
    splitResult.right.length > 0 &&
    splitResult.left.length < (editingValueStore.getState() ?? '').length

  return canSplit ? splitResult : null
}

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Command['exec'] = (dispatch, getState, e, { type }: { type: string }) => {
  const state = getState()
  const { cursor } = state

  const splitResult = type === 'keyboard' ? split(state, e.target as HTMLElement) : null

  // prevent split on gesture
  if (splitResult) {
    const thought = cursor && pathToThought(state, cursor)

    // Determine if thought is uneditable
    const uneditable = cursor && findDescendant(state, head(cursor) ?? null, '=uneditable')

    dispatch(
      thought && uneditable
        ? errorActionCreator({ value: `"${ellipsize(thought?.value)}" is uneditable and cannot be split.` })
        : splitThought({ splitResult }),
    )
  } else {
    dispatch(newThought({ value: '' }))
  }
}

const multicursor = {
  enabled: false,
  error: 'Cannot create a new thought with multiple thoughts.',
}

const newThoughtShortcut: Command = {
  id: 'newThought',
  label: 'New Thought',
  description: 'Create a shiny new thought.',
  keyboard: { key: Key.Enter },
  gesture: 'rd',
  multicursor,
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newThoughtAliases: Command = {
  id: 'newThoughtAliases',
  label: 'New Thought',
  hideFromHelp: true,
  gesture: ['rdldl', 'rdldld', 'rldl', 'rldld', 'rldldl'],
  multicursor,
  // on mobile, the shift key should cause a normal newThought, not newThoughtAbove
  // smuggle it in with the aliases
  ...(isTouch ? { keyboard: { key: Key.Enter, shift: true } } : null),
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
}

export default newThoughtShortcut
