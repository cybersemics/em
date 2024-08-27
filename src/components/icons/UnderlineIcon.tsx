import { icon } from '../../../styled-system/recipes'
import Icon from '../../@types/Icon'

/** Underline icon. */
const UnderlineIcon = ({ style, size }: Icon) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    version='1.1'
    x='0'
    y='0'
    viewBox='-80 -100 460 460'
    className={icon()}
    width={size}
    height={size}
    style={{ ...style }}
  >
    <path
      d='M230,0c-8.284,0-15,6.716-15,15v130c0,35.841-29.16,65-65.002,65c-17.362,0-33.684-6.762-45.961-19.038
		C91.759,178.685,84.999,162.361,85,144.999V15c0-8.284-6.716-15-15-15S55,6.716,55,15v129.998
		c-0.001,25.375,9.879,49.232,27.823,67.177c17.943,17.943,41.8,27.825,67.175,27.825C202.382,240,245,197.383,245,145V15
		C245,6.716,238.284,0,230,0z'
    ></path>
    <path d='M230,270H70c-8.284,0-15,6.716-15,15s6.716,15,15,15h160c8.284,0,15-6.716,15-15S238.284,270,230,270z'></path>
  </svg>
)

export default UnderlineIcon
