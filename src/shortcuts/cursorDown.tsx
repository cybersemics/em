import { Key } from 'ts-key-enum'
import Dispatch from '../@types/Dispatch'
import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import { cursorDownActionCreator as cursorDown } from '../actions/cursorDown'
import * as selection from '../device/selection'
import attributeEquals from '../selectors/attributeEquals'
import rootedParentOf from '../selectors/rootedParentOf'
import head from '../util/head'
import headValue from '../util/headValue'
// import directly since util/index is not loaded yet when shortcut is initialized
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

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
    viewBox='0 0 19.481 19.481'
    enableBackground='new 0 0 19.481 19.481'
  >
    <g>
      <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
    </g>
  </svg>
)

const cursorDownShortcut: Shortcut = {
  id: 'cursorDown',
  label: 'Cursor Down',
  keyboard: { key: Key.ArrowDown },
  hideFromInstructions: true,
  svg: Icon,
  canExecute: getState => {
    const state = getState()
    const { cursor } = state

    if (!cursor) return true

    // use default browser behavior in prose mode
    const parentId = head(rootedParentOf(state, cursor))
    const isProseView = attributeEquals(state, parentId, '=view', 'Prose')
    const isProseMode = isProseView && selection.isActive() && selection.offset()! < headValue(state, cursor).length - 1
    if (isProseMode) return false

    // use default browser behavior (i.e. caret down) if there is a valid selection and it's not on the last line of a multi-line editable
    return selection.isOnLastLine()
  },
  exec: throttleByAnimationFrame((dispatch: Dispatch) => dispatch(cursorDown())),
}

export default cursorDownShortcut
