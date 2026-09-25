import pluralize from 'pluralize'
import Command from '../@types/Command'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { alertActionCreator as alert } from '../actions/alert'
import SettingsIcon from '../components/icons/SettingsIcon'
import copy from '../device/copy'
import * as selection from '../device/selection'
import exportContext from '../selectors/exportContext'
import getMulticursorThoughtIds from '../selectors/getMulticursorThoughtIds'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import simplifyPath from '../selectors/simplifyPath'
import exportPhrase from '../util/exportPhrase'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import strip from '../util/strip'
import trimBullet from '../util/trimBullet'

/** Copies the selected complete subtrees and returns their visible text for the alert. */
const copyThoughts = (ids: ThoughtId[], state: State): string => {
  const exported = ids.map(id => strip(exportContext(state, id, 'text/plain'))).join('\n')
  const exportedHtml = ids.map(id => exportContext(state, id, 'text/html')).join('\n')
  const exportedVisible = ids.map(id => exportContext(state, id, 'text/plain', { excludeMeta: true })).join('\n')

  // Write text/html and the text/em marker alongside the plain text so structured paste works even when
  // the browser does not fire a native copy event for the collapsed selection (e.g. Safari) (#3993).
  copy(trimBullet(exported), { html: exportedHtml })

  return exportedVisible
}

const copyCursorCommand = {
  id: 'copyCursor',
  label: 'Copy Cursor' as const,
  description: 'Copies the cursor and all descendants.',
  keyboard: { key: 'c', meta: true },
  multicursor: {
    // Copying never moves the cursor, so there is nothing to restore. Restoring it anyway would clear and
    // re-add the multicursors and recompute state.expanded, and that residual change is enough to leave an
    // undo entry labeled Copy Cursor for a command that does not touch the thoughtspace.
    preventSetCursor: true,
    execMulticursor: (cursors, dispatch, getState) => {
      const ids = getMulticursorThoughtIds(getState())

      const exportedVisible = copyThoughts(ids, getState())

      const numThoughts = ids.length
      const numDescendants = exportedVisible.split('\n').length - numThoughts

      dispatch(
        alert(
          `Copied ${pluralize('thought', numThoughts, true)}${
            numDescendants > 0 ? ` and ${pluralize('descendant', numDescendants, true)}` : ''
          } to the clipboard`,
        ),
      )
    },
  },
  // TODO: Create unique icon
  svg: SettingsIcon,
  permitDefault: true,
  canExecute: state => {
    // do not copy cursor if there is a browser selection
    return selection.isCollapsed() && (!!state.cursor || hasMulticursor(state)) && isDocumentEditable()
  },
  exec: (dispatch, getState) => {
    const state = getState()
    const simplePath = simplifyPath(state, state.cursor!)

    const exportedVisible = copyThoughts([head(simplePath)], state)

    const numDescendants = exportedVisible ? exportedVisible.split('\n').length - 1 : 0
    const phrase = exportPhrase(head(simplePath), numDescendants, {
      value: getThoughtById(getState(), head(simplePath))?.value,
    })

    dispatch(alert(`Copied ${phrase} to the clipboard`))
  },
} satisfies Command

export default copyCursorCommand
