import { FC } from 'react'
import { useSelector } from 'react-redux'
import Index from '../../@types/IndexType'
import themeColors from '../../selectors/themeColors'

export interface IconProps {
  fill?: string
  size?: number
  style?: Index<string>
}

// eslint-disable-next-line jsdoc/require-jsdoc
const CheckmarkIcon: FC<IconProps> = ({ fill, size = 20, style }) => {
  const colors = useSelector(themeColors)
  return (
    <svg
      className='icon'
      x='0px'
      y='0px'
      viewBox='0 0 21 21'
      width={size}
      height={size}
      fill={fill || colors.fg}
      style={style}
    >
      <g>
        <path d='M19.2952015,3.31893528e-14 L19.5415085,3.95769738 C13.0276723,8.57236895 10.4641767,13.2217635 7.38964606,19.37824 C5.31280885,16.6951964 1.95521642,15.0609643 0,13.7243616 C0.666958436,12.9733838 1.48046906,12.0198312 2.22601684,11.2530304 C4.03754204,12.5282096 5.72925646,13.8300426 7.17983121,15.4661139 C10.4002426,10.3240004 14.7792921,3.90138572 19.2952015,3.31893528e-14 L19.2952015,3.31893528e-14 Z'></path>
      </g>
    </svg>
  )
}

export default CheckmarkIcon
