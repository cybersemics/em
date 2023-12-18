import { useSelector } from 'react-redux'
import IconType from '../../@types/Icon'
import themeColors from '../../selectors/themeColors'

/** A home icon. */
const HomeIcon = ({ className, fill, size, style }: IconType) => {
  const sizeCalculated = useSelector(state => size || state.fontSize)
  const colors = useSelector(themeColors)
  return (
    <span role='img' aria-label='home' className='logo-wrapper'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width={sizeCalculated}
        height={sizeCalculated}
        viewBox='0 0 24 24'
        className={`logo ${className}`}
        fill={fill || colors.fg}
        style={{
          height: sizeCalculated,
          width: sizeCalculated,
          ...style,
        }}
      >
        <path d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' />
        <path d='M0 0h24v24H0z' fill='none' />
      </svg>
    </span>
  )
}

export default HomeIcon
