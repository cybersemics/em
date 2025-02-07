import { css, cx } from '../../styled-system/css'
import { iconRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import IconType from '../@types/IconType'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import isContextViewActive from '../selectors/isContextViewActive'
import lastThoughtsFromContextChain from '../selectors/lastThoughtsFromContextChain'
import rootedParentOf from '../selectors/rootedParentOf'
import splitChain from '../selectors/splitChain'
import isDocumentEditable from '../util/isDocumentEditable'
import pathToContext from '../util/pathToContext'

// eslint-disable-next-line jsdoc/require-jsdoc, react-refresh/only-export-components
const Icon = ({ fill = token('colors.bg'), size = 20, style, cssRaw }: IconType) => (
  <svg
    version='1.1'
    className={cx(iconRecipe(), css(cssRaw))}
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    fill={fill}
    style={style}
    viewBox='0 0 19.481 19.481'
    enableBackground='new 0 0 19.481 19.481'
  >
    <g>
      <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
    </g>
  </svg>
)

const bindContextCommand: Command = {
  id: 'bindContext',
  label: 'Bind Context',
  svg: Icon,
  description: 'Bind two different contexts of a thought so that they always have the same children.',
  gesture: 'rud',
  multicursor: {
    enabled: false,
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
