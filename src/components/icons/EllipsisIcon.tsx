import { token } from '../../../styled-system/tokens'

/** Ellipsis icon. */
const EllipsisIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' style={{ width: '100%', height: '100%' }} fill='none' viewBox='0 0 20 4'>
    <circle cx='2' cy='2' r='2' fill={token('colors.gray50')}></circle>
    <circle cx='10' cy='2' r='2' fill={token('colors.gray50')}></circle>
    <circle cx='18' cy='2' r='2' fill={token('colors.gray50')}></circle>
  </svg>
)

export default EllipsisIcon
