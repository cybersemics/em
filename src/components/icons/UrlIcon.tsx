import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'

/** Url icon. */
const UrlIcon = () => {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 30 30'
      className={css({
        marginLeft: '2px',
        // Pad only the right, to separate the icon from the text that follows it. Vertical padding would make the
        // svg taller than the 1em link that clips it, pushing the icon below the text baseline.
        paddingRight: '0.167em',
        cursor: 'pointer',
      })}
    >
      <path
        fill={token('colors.gray50')}
        d='M 25.980469 2.9902344 A 1.0001 1.0001 0 0 0 25.869141 3 L 20 3 A 1.0001 1.0001 0 1 0 20 5 L 23.585938 5 L 13.292969 15.292969 A 1.0001 1.0001 0 1 0 14.707031 16.707031 L 25 6.4140625 L 25 10 A 1.0001 1.0001 0 1 0 27 10 L 27 4.1269531 A 1.0001 1.0001 0 0 0 25.980469 2.9902344 z M 6 7 C 4.9069372 7 4 7.9069372 4 9 L 4 24 C 4 25.093063 4.9069372 26 6 26 L 21 26 C 22.093063 26 23 25.093063 23 24 L 23 14 L 23 11.421875 L 21 13.421875 L 21 16 L 21 24 L 6 24 L 6 9 L 14 9 L 16 9 L 16.578125 9 L 18.578125 7 L 16 7 L 14 7 L 6 7 z'
      ></path>
    </svg>
  )
}

export default UrlIcon
