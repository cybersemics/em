import { useSelector } from 'react-redux'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** A home icon. */
const HomeIcon = ({ className, fill, size, style, wrapperClassName }: IconType & { wrapperClassName?: string }) => {
  const sizeCalculated = useSelector(state => size || state.fontSize)
  return (
    <span role='img' aria-label='home' className={wrapperClassName}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width={sizeCalculated}
        height={sizeCalculated}
        viewBox='0 0 24 24'
        className={`logo ${className}`}
        fill={fill || token('colors.fg')}
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
