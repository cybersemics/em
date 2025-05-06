import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import { toggleDropdownActionCreator } from '../actions/toggleDropdown'
import fastClick from '../util/fastClick'
import EllipsisIcon from './icons/EllipsisIcon'

/** This ellipsis icon shows next to the cursor thought. When tapped, it opens the Command Menu. */
const BulletEllipsis = () => {
  const dispatch = useDispatch()
  return (
    <div
      {...fastClick(e => {
        e.stopPropagation() // prevent the click from bubbling up to the wrapper span in Bullet.tsx
        dispatch(toggleDropdownActionCreator({ dropDownType: 'commandMenu' }))
      })}
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
