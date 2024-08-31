import { useSelector } from 'react-redux'
import Icon from '../../@types/Icon'
import themeColors from '../../selectors/themeColors'

/** A swap parent icon. */
const SwapParentIcon = ({ fill, size = 20, style }: Icon) => {
  const colors = useSelector(themeColors)
  return (
    <svg
      className={'icon'}
      x='0px'
      y='0px'
      width={size}
      height={size}
      style={{
        fill: fill || colors.fg,
        ...style,
      }}
      viewBox='0 0 24 27'
    >
      <g>
        <path d='M12,21a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V5.41l-.29.29A1,1,0,0,1,2.29,4.29l2-2h0a1,1,0,0,1,1.41,0h0l2,2A1,1,0,1,1,6.29,5.71L6,5.41V20h5A1,1,0,0,1,12,21Zm9.71-2.71a1,1,0,0,0-1.41,0l-.29.29V3a1,1,0,0,0-1-1H13a1,1,0,0,0,0,2h5V18.59l-.29-.29a1,1,0,0,0-1.41,1.41l2,2h0a1,1,0,0,0,1.41,0h0l2-2A1,1,0,0,0,21.71,18.29Z' />
      </g>
    </svg>
  )
}

export default SwapParentIcon
