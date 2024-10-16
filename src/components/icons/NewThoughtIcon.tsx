import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import Icon from '../../@types/Icon'

/** New thought icon. */
const NewThoughtIcon = ({ style, size, cssRaw }: Icon) => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      version='1.1'
      x='0'
      y='0'
      viewBox='0 0 83.46 83.46'
      className={cx(icon(), css(cssRaw))}
      width={size}
      height={size}
      style={{ ...style }}
    >
      <path d='m41.73,0C18.72,0,0,18.72,0,41.73s18.72,41.73,41.73,41.73,41.73-18.72,41.73-41.73S64.74,0,41.73,0Zm0,79.49c-20.82,0-37.76-16.94-37.76-37.76S20.91,3.97,41.73,3.97s37.76,16.94,37.76,37.76-16.94,37.76-37.76,37.76Zm22.69-37.76c0,1.1-.89,1.99-1.99,1.99h-18.71v18.71c0,1.1-.89,1.99-1.99,1.99s-1.99-.89-1.99-1.99v-18.71h-18.71c-1.1,0-1.99-.89-1.99-1.99s.89-1.99,1.99-1.99h18.71v-18.71c0-1.1.89-1.99,1.99-1.99s1.99.89,1.99,1.99v18.71h18.71c1.1,0,1.99.89,1.99,1.99Z'></path>
    </svg>
  )
}

export default NewThoughtIcon
