import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import { toggleCommandMenuActionCreator } from '../actions/toggleCommandMenu'
import fastClick from '../util/fastClick'
import EllipsisIcon from './icons/EllipsisIcon'

/** This ellipsis icon shows next to the cursor thought. When tapped, it opens the Command Menu. */
const BulletEllipsis = () => {
  const dispatch = useDispatch()
  return (
    <div
      {...fastClick(() => dispatch(toggleCommandMenuActionCreator()))}
      // stop click & mouseDown events from bubbling up to Content.clickOnEmptySpace
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      className={css({
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        left: -56,
        top: 3,
        width: 30,
        height: 30,
      })}
    >
      <EllipsisIcon />
    </div>
  )
}

export default BulletEllipsis
