import React from 'react'
import Svg, { G, Path } from 'react-native-svg'
import { Key } from 'ts-key-enum'
import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import alert from '../action-creators/alert'
import archiveThought from '../action-creators/archiveThought'
import error from '../action-creators/error'
import { AlertType, HOME_PATH } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import isEM from '../util/isEM'
import isRoot from '../util/isRoot'

let undoArchiveTimer: number // eslint-disable-line fp/no-let

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
      const allChildren = getAllChildrenAsThoughts(state, head(path))
      const childNote = allChildren.find(child => child.value === '=note')
      // we know there is a =note child if noteFocus is true
      // we just need to get the Child object so that archiveThought has the full path
      const pathNote = appendToPath(path, childNote!.id)
      dispatch(archiveThought({ path: pathNote }))
    } else {
      // clear the undo alert timer to prevent previously cleared undo alert from closing this one
      clearTimeout(undoArchiveTimer)

      // close the alert after a delay
      // only close the alert if it is an undo alert
      undoArchiveTimer = setTimeout(() => {
        const state = getState()
        if (state.alert && state.alert.alertType === AlertType.ThoughtArchived) {
          dispatch(alert(null))
        }
        // TODO: Fix global setTimeout type issue
      }, 5000) as any as number

      // archive the thought
      dispatch(archiveThought({ path: state.cursor ?? undefined }))
    }
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => (
  <Svg width={size} height={size} fill={fill} viewBox='0 0 20 16'>
    <G>
      <Path d='M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1V2zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5H2zm13-3H1v2h14V2zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z' />
    </G>
  </Svg>
)

const archiveShortcut: Shortcut = {
  id: 'archive',
  label: 'Archive',
  description: 'Archive the current thought.',
  gesture: 'ldldl',
  svg: Icon,
  keyboard: { key: Key.Backspace, alt: true, shift: true, meta: true },
  // canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec,
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const archiveAliases: Shortcut = {
  id: 'archiveAliases',
  label: 'Archive',
  hideFromInstructions: true,
  gesture: [
    'ldlr',
    'ldldr',
    'ldldlr',
    'ldldldr',
    'lrdl',
    'lrdrl',
    'lrdldr',
    'lrdldlr',
    'ldru',
    'ldrlru',
    'ldldlru',
    'ldldrlru',
    'ldllru',
    'ldldrld',
    'ldldldld',
    'ldld',
    'ldldld',
    'ldlru',
    'ldldru',
    'ldldldru',
    'lrdru',
    'lrdlru',
    'lrdldru',
    'lrdldlru',
  ],
  // canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec,
}

export default archiveShortcut
