import React from 'react'
import { Key } from 'ts-key-enum'
import { isTouch } from '../browser'
import { hasChild } from '../selectors'
import { ellipsize, isDocumentEditable, headValue, isEM, isRoot, pathToContext, setSelection } from '../util'
import { alert, archiveThought, deleteAttribute, error } from '../action-creators'
import asyncFocus from '../device/asyncFocus'
import { Icon as IconType, Shortcut } from '../@types'

let undoArchiveTimer: number // eslint-disable-line fp/no-let

/** Gets the editable node for the given note element. */
const editableOfNote = (noteEl: HTMLElement) => {
  const closest = noteEl.closest('.thought-container')
  return closest ? (closest.querySelector('.editable') as HTMLElement) : null
}
// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e) => {
  const state = getState()
  const { cursor, noteFocus } = state

  if (cursor) {
    const context = pathToContext(cursor)
    if (isEM(cursor) || isRoot(cursor)) {
      dispatch(error({ value: `The "${isEM(cursor) ? 'em' : 'home'} context" cannot be archived.` }))
    } else if (hasChild(state, context, '=readonly')) {
      dispatch(error({ value: `"${ellipsize(headValue(cursor))}" is read-only and cannot be archived.` }))
    } else if (noteFocus) {
      const editable = e.target ? editableOfNote(e.target as HTMLElement) : null
      dispatch(deleteAttribute({ context, key: '=note' }))

      // restore selection manually since Editable is not re-rendered
      if (isTouch) {
        asyncFocus()
      }
      if (editable) {
        editable.focus()
        setSelection(editable, { end: true })
      }
    } else {
      // clear the undo alert timer to prevent previously cleared undo alert from closing this one
      clearTimeout(undoArchiveTimer)

      // close the alert after a delay
      // only close the alert if it is an undo alert
      undoArchiveTimer = window.setTimeout(() => {
        const state = getState()
        if (state.alert && state.alert.alertType === 'undoArchive') {
          dispatch(alert(null))
        }
      }, 5000)

      // archive the thought
      dispatch(archiveThought({ path: state.cursor ?? undefined }))
    }
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => (
  <svg
    version='1.1'
    className='icon'
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    fill={fill}
    style={style}
    viewBox='0 0 20 16'
    enableBackground='new 0 0 50 50'
  >
    <g>
      <path d='M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1V2zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5H2zm13-3H1v2h14V2zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z' />
    </g>
  </svg>
)

const archiveShortcut: Shortcut = {
  id: 'archive',
  label: 'Archive',
  description: 'Archive the current thought.',
  gesture: 'ldl',
  svg: Icon,
  keyboard: { key: Key.Backspace, shift: true, meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec,
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const archiveAliases: Shortcut = {
  id: 'archiveAliases',
  label: 'Archive',
  hideFromInstructions: true,
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
