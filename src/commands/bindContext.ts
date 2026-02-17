import Command from '../@types/Command'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import BindContextIcon from '../components/icons/BindContextIcon'
import isContextViewActive from '../selectors/isContextViewActive'
import lastThoughtsFromContextChain from '../selectors/lastThoughtsFromContextChain'
import rootedParentOf from '../selectors/rootedParentOf'
import splitChain from '../selectors/splitChain'
import isDocumentEditable from '../util/isDocumentEditable'
import pathToContext from '../util/pathToContext'
import gestures from './gestures'

const bindContextCommand: Command = {
  id: 'bindContext',
  label: 'Bind Context',
  svg: BindContextIcon,
  description: 'Bind two different contexts of a thought so that they always have the same children.',
  gesture: gestures.BIND_CONTEXT_GESTURE,
  multicursor: {
    disallow: true,
    error: 'Cannot bind multiple thoughts.',
  },
  keyboard: { key: 'b', shift: true, alt: true },
  hideFromHelp: true,
  canExecute: state => isDocumentEditable() && !!state.cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    const path = rootedParentOf(state, cursor)

    if (!cursor || !isContextViewActive(state, path)) return

    const contextChain = splitChain(state, cursor)
    const contextBound = pathToContext(state, lastThoughtsFromContextChain(state, contextChain))

    dispatch(
      toggleAttribute({
        path: path,
        values: ['=bindContextCommand', JSON.stringify(contextBound)],
      }),
    )
  },
}

export default bindContextCommand
