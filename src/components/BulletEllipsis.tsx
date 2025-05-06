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
      // stop mouseDown events from bubbling up to Content.clickOnEmptySpace
      onMouseDown={e => e.stopPropagation()}
      className={css({
        position: 'absolute',
        height: '2em',
        width: '2em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '-1.75em',
      })}
    >
      <div
        className={css({
          width: '65%',
          height: '65%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <EllipsisIcon />
      </div>
    </div>
  )
}

export default BulletEllipsis
