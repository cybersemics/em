import Command from '../@types/Command'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import BindContextIcon from '../components/icons/BindContextIcon'
import isContextViewActive from '../selectors/isContextViewActive'
import lastThoughtsFromContextChain from '../selectors/lastThoughtsFromContextChain'
import rootedParentOf from '../selectors/rootedParentOf'
import splitChain from '../selectors/splitChain'
import isDocumentEditable from '../util/isDocumentEditable'
import pathToContext from '../util/pathToContext'

const bindContextCommand: Command = {
  id: 'bindContext',
  label: 'Bind Context',
  svg: BindContextIcon,
  description: 'Bind two different contexts of a thought so that they always have the same children.',
  gesture: 'rud',
  // Bind each selected context in turn. Selected contexts of different context views each get their own binding.
  // Selected contexts of the same context view overwrite each other, since =bindContextCommand holds a single
  // context, so the last one in document order wins — exactly as if the command were invoked on each in turn.
  multicursor: true,
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
