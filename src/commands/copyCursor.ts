import pluralize from 'pluralize'
import Command from '../@types/Command'
import Dispatch from '../@types/Dispatch'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
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

/** Pulls any pending descendants for the given thought IDs, exports them to plain text, copies to clipboard, and returns data for constructing the alert message. */
const copyThoughts = async (ids: ThoughtId[], dispatch: Dispatch, getState: () => State): Promise<string> => {
  const state = getState()
  const needsPull = ids.some(id =>
    someDescendants(state, id, child => isPending(state, getThoughtById(state, child.id))),
  )

  if (needsPull) {
    dispatch(alert('Loading thoughts...', { clearDelay: null }))
    await dispatch(pull(ids, { maxDepth: Infinity }))
  }

  const stateAfterPull = getState()

  const exported = ids.map(id => strip(exportContext(stateAfterPull, id, 'text/plain'))).join('\n')
  const exportedVisible = ids
    .map(id => exportContext(stateAfterPull, id, 'text/plain', { excludeMeta: true }))
    .join('\n')

  copy(trimBullet(exported))

  return exportedVisible
}

const copyCursorCommand: Command = {
  id: 'copyCursor',
  label: 'Copy Cursor',
  description: 'Copies the cursor and all descendants.',
  keyboard: { key: 'c', meta: true },
  multicursor: {
    execMulticursor: async (cursors, dispatch, getState) => {
      const filteredCursors = cursors.reduce<Path[]>((acc, cur) => {
        const hasAncestor = acc.some(p => cur.includes(head(p)))
        if (hasAncestor) return acc
        return [...acc.filter(p => !p.includes(head(cur))), cur]
      }, [])

      const exportedVisible = await copyThoughts(
        filteredCursors.map(cursor => head(cursor)),
        dispatch,
        getState,
      )

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

    const exportedVisible = await copyThoughts([head(simplePath)], dispatch, getState)

    const numDescendants = exportedVisible ? exportedVisible.split('\n').length - 1 : 0
    const phrase = exportPhrase(head(simplePath), numDescendants, {
      value: getThoughtById(getState(), head(simplePath))?.value,
    })

    dispatch(alert(`Copied ${phrase} to the clipboard`))
  },
}

export default copyCursorCommand
