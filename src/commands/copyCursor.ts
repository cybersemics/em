import pluralize from 'pluralize'
import Command from '../@types/Command'
import Path from '../@types/Path'
import { alertActionCreator as alert } from '../actions/alert'
import { pullActionCreator as pull } from '../actions/pull'
import SettingsIcon from '../components/icons/SettingsIcon'
import copy from '../device/copy'
import * as selection from '../device/selection'
import exportContext from '../selectors/exportContext'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import isPending from '../selectors/isPending'
import simplifyPath from '../selectors/simplifyPath'
import someDescendants from '../selectors/someDescendants'
import exportPhrase from '../util/exportPhrase'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import strip from '../util/strip'
import trimBullet from '../util/trimBullet'

const copyCursorCommand: Command = {
  id: 'copyCursor',
  label: 'Copy Cursor',
  description: 'Copies the cursor and all descendants.',
  keyboard: { key: 'c', meta: true },
  multicursor: {
    execMulticursor: async (cursors, dispatch, getState) => {
      const state = getState()

      const filteredCursors = cursors.reduce<Path[]>((acc, cur) => {
        const hasAncestor = acc.some(p => cur.includes(head(p)))
        if (hasAncestor) return acc
        return [...acc.filter(p => !p.includes(head(cur))), cur]
      }, [])

      // Pull all thoughts if any are pending
      const needsPull = filteredCursors.some(cursor =>
        someDescendants(state, head(cursor), child => isPending(state, getThoughtById(state, child.id))),
      )

      if (needsPull) {
        dispatch(alert('Loading thoughts...', { clearDelay: null }))
        await dispatch(
          pull(
            filteredCursors.map(cursor => head(cursor)),
            { maxDepth: Infinity },
          ),
        )
      }

      // Get new state after pull
      const stateAfterPull = getState()

      // Export and copy all selected thoughts, including metaprogramming attributes
      const exported = filteredCursors
        .map(cursor => exportContext(stateAfterPull, head(cursor), 'text/plain'))
        .join('\n')

      // Export visible thoughts only when counting descendants
      const exportedVisible = filteredCursors
        .map(cursor => exportContext(stateAfterPull, head(cursor), 'text/plain', { excludeMeta: true }))
        .join('\n')

      copy(trimBullet(exported))

      const numThoughts = filteredCursors.length
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
  exec: async (dispatch, getState) => {
    const state = getState()
    const simplePath = simplifyPath(state, state.cursor!)

    // if there are any pending descendants, do a pull
    // otherwise copy whatever is in state
    if (someDescendants(state, head(simplePath), child => isPending(state, getThoughtById(state, child.id)))) {
      dispatch(alert('Loading thoughts...', { clearDelay: null }))
      await dispatch(pull([head(simplePath)], { maxDepth: Infinity }))
    }

    // get new state after pull
    const stateAfterPull = getState()

    const exported = strip(exportContext(stateAfterPull, head(simplePath), 'text/plain'))

    // Export visible thoughts only when counting descendants
    const exportedVisible = exportContext(stateAfterPull, head(simplePath), 'text/plain', { excludeMeta: true })

    copy(trimBullet(exported))

    const numDescendants = exportedVisible ? exportedVisible.split('\n').length - 1 : 0
    const phrase = exportPhrase(head(simplePath), numDescendants, {
      value: getThoughtById(stateAfterPull, head(simplePath))?.value,
    })

    dispatch(alert(`Copied ${phrase} to the clipboard`))
  },
}

export default copyCursorCommand
