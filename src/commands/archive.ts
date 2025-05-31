import pluralize from 'pluralize'
import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { archiveThoughtActionCreator as archiveThought } from '../actions/archiveThought'
import { errorActionCreator as error } from '../actions/error'
import ArchiveIcon from '../components/icons/ArchiveIcon'
import { AlertType, DELETE_VIBRATE_DURATION, HOME_PATH } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import haptics from '../util/haptics'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Command['exec'] = (dispatch, getState) => {
  const state = getState()
  const { cursor, noteFocus } = state

  if (cursor) {
    if (isEM(cursor) || isRoot(cursor)) {
      dispatch(error({ value: `The "${isEM(cursor) ? 'em' : 'home'} context" cannot be archived.` }))
    } else if (findDescendant(state, head(cursor), '=readonly')) {
      const cursorThought = getThoughtById(state, head(cursor))
      if (!cursorThought) return
      dispatch(error({ value: `"${ellipsize(cursorThought.value)}" is read-only and cannot be archived.` }))
    } else if (noteFocus) {
      const path = state.cursor || HOME_PATH
      const childNote = findAnyChild(state, head(path), child => child.value === '=note')
      // we know there is a =note child if noteFocus is true
      // we just need to get the Child object so that archiveThought has the full path
      const pathNote = appendToPath(path, childNote!.id)
      dispatch(archiveThought({ path: pathNote }))
    } else {
      const value = getThoughtById(state, head(cursor))?.value
      if (value !== '') {
        haptics.vibrate(DELETE_VIBRATE_DURATION)
      }

      // archive the thought
      dispatch(archiveThought({ path: state.cursor ?? undefined }))
    }
  }
}

const archiveCommand: Command = {
  id: 'archive',
  label: 'Archive',
  description: 'Move the thought to a hidden archive. It can be recovered or viewed by toggling hidden thoughts.',
  // Main gesture and alternate patterns to help with mis-swipes
  gesture: [
    'ldl',
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
  multicursor: {
    preventSetCursor: true,
    clearMulticursor: true,
    onComplete(filteredCursors, dispatch, getState) {
      dispatch(
        alert(`Deleted ${pluralize('thought', filteredCursors.length, true)}.`, {
          alertType: AlertType.ThoughtDeleted,
          clearDelay: 8000,
          showCloseLink: true,
        }),
      )
    },
  },
  svg: ArchiveIcon,
  keyboard: { key: Key.Backspace, shift: true, meta: true },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec,
}

export default archiveCommand
