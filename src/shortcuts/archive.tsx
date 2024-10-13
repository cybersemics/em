import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import { archiveThoughtActionCreator as archiveThought } from '../actions/archiveThought'
import { errorActionCreator as error } from '../actions/error'
import ArchiveIcon from '../components/icons/ArchiveIcon'
import { AlertType, HOME_PATH } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'

let undoArchiveTimer: number

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e) => {
  const state = getState()
  const { cursor, noteFocus } = state

  if (cursor) {
    const cursorThought = getThoughtById(state, head(cursor))
    if (isEM(cursor) || isRoot(cursor)) {
      dispatch(error({ value: `The "${isEM(cursor) ? 'em' : 'home'} context" cannot be archived.` }))
    } else if (findDescendant(state, head(cursor), '=readonly')) {
      dispatch(error({ value: `"${ellipsize(cursorThought.value)}" is read-only and cannot be archived.` }))
    } else if (noteFocus) {
      const path = state.cursor || HOME_PATH
      const childNote = findAnyChild(state, head(path), child => child.value === '=note')
      const pathNote = appendToPath(path, childNote!.id)
      dispatch(archiveThought({ path: pathNote }))
    } else {
      clearTimeout(undoArchiveTimer)
      undoArchiveTimer = window.setTimeout(() => {
        const state = getState()
        if (state.alert && state.alert.alertType === AlertType.ThoughtArchived) {
          dispatch(alert(null))
        }
      }, 5000)
      dispatch(archiveThought({ path: state.cursor ?? undefined }))
    }
  }
}

const archiveShortcut: Shortcut = {
  id: 'archive',
  label: 'Archive',
  description: 'Move the thought to a hidden archive. It can be recovered or viewed by toggling hidden thoughts.',
  gesture: 'ldl',
  svg: ArchiveIcon,
  keyboard: { key: Key.Backspace, shift: true, meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec,
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const archiveAliases: Shortcut = {
  id: 'archiveAliases',
  svg: ArchiveIcon,
  label: 'Archive',
  hideFromHelp: true,
  gesture: [
    'ldlr',
    'lrdl',
    'lrdrl',
    'lrdldr',
    'lrdldlr',
    'ldru',
    'ldrlru',
    'ldllru',
    'ldlru',
    'lrdru',
    'lrdlru',
    'lrdldru',
    'lrdldlru',
  ],
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec,
}

export default archiveShortcut
