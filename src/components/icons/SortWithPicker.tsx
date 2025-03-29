import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import IconType from '../../@types/IconType'
import FadeTransition from '../FadeTransition'
import SortPicker from '../SortPicker'
import SortIcon from './Sort'

/** Sort Icon Component with popup SortPicker. */
const SortWithPicker = ({ size = 18, style, cssRaw }: IconType) => {
  const showSortPicker = useSelector(state => state.showSortPicker)
  const toolbarPopupRef = useRef<HTMLDivElement>(null)

  return (
    <div>
      <SortIcon size={size} style={style} cssRaw={cssRaw} animated={showSortPicker} />
      <FadeTransition duration='fast' nodeRef={toolbarPopupRef} in={showSortPicker} exit={false} unmountOnExit>
        <div
          ref={toolbarPopupRef}
          className={css({
            position: 'relative',
            zIndex: 'stack',
            // position fixed or absolute causes the SortPicker to get clipped by the toolbar's overflow-x: scroll
            // ideally we want overflow-x:scroll and overflow-y:visible, but Safari does not differing allow overflow-x and overflow-y
            // instead, keep position:static but set the width to 0
            // this will increase the height of the toolbar so the SortPicker does not get clipped without taking up horizontal space
            width: 0,
          })}
          style={{
            // eyeballing it to get font sizes 14–24 to look right
            left: (size * (size + 90)) / 200 + 600 / (size * size),
            marginTop: size * 1.2 - 10,
          }}
        >
          <SortPicker fontSize={size} cssRaw={css.raw({ transform: `translate(-50%)` })} />
        </div>
      </FadeTransition>
    </div>
  )
}

export default SortWithPicker
