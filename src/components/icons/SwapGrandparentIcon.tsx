import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import IconType from '../../@types/IconType'

/** Icon for the swapGrandparent command: three levels of a lineage, with the outer two exchanging places around the untouched middle one. */
const SwapGrandparentIcon = ({ fill, size = 18, style = {}, cssRaw }: IconType) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    className={cx(iconRecipe(), css(cssRaw))}
    viewBox='0 0 24 24'
    width={size}
    height={size}
    style={{ ...style, color: style.fill || fill }}
    fill='none'
  >
    <rect width='24' height='24' fill='none' />
    <line x1='6.2' y1='4.9' x2='6.2' y2='19.1' stroke='currentColor' strokeOpacity='0.3' strokeLinecap='round' />
    <circle cx='6.2' cy='3.5' r='1.4' fill='currentColor' />
    <circle cx='6.2' cy='12' r='1.2' fill='currentColor' opacity='0.35' />
    <circle cx='6.2' cy='20.5' r='1.4' fill='currentColor' />
    <path d='M9.8,4.4C21.2,7,21.2,17,9.8,19.6' fill='none' stroke='currentColor' strokeLinejoin='round' />
    <polyline points='8.59 3.06 9.8 4.4 8.13 5.08' fill='none' stroke='currentColor' strokeLinejoin='round' />
    <polyline points='8.59 20.94 9.8 19.6 8.13 18.92' fill='none' stroke='currentColor' strokeLinejoin='round' />
  </svg>
)

export default SwapGrandparentIcon
