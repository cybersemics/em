import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import { SystemStyleObject } from '../../../styled-system/types'
import Index from '../../@types/IndexType'

// Gesture icon:
//   https://thenounproject.com/icon/gesture-2211316/
//
// Alternative icons
//   https://thenounproject.com/icon/gesture-1068522/
//   https://thenounproject.com/icon/gesture-1438225/
//   https://thenounproject.com/icon/gesture-2083381/
//   https://thenounproject.com/icon/gesture-318977/

/** Icon for GestureHint. */
const GestureHintIcon: FC<{
  fill?: string
  size: number
  style?: Index<string>
  className?: string
  cssRaw?: SystemStyleObject
}> = ({ fill, size = 20, style, cssRaw }) => {
  return (
    <svg
      version='1.1'
      x='0px'
      y='0px'
      viewBox='50 -50 575 575'
      className={cx(iconRecipe(), css(cssRaw))}
      width={size}
      height={size}
      fill={fill || token('colors.fg')}
      style={style}
    >
      <g>
        <path d='m521.36 38.078h-244.16c-26.32 0-49.84 10.641-66.641 28-17.359 16.801-28 40.879-28 66.641 0 38.078 22.961 71.121 55.441 86.238v-60.477c0-16.238 6.1602-31.922 17.922-43.121 11.762-11.762 26.879-17.922 43.121-17.922 33.602 0 61.039 27.441 61.039 61.039v68.879h161.28c26.32 0 49.84-10.641 66.641-28 17.359-16.801 28-40.879 28-66.641-0.003906-52.074-42.562-94.637-94.645-94.637zm34.719 102.48-33.602 33.602c-2.2383 2.2383-5.0391 3.3594-7.8398 3.3594s-5.6016-1.1211-7.8398-3.3594c-4.4805-4.4805-4.4805-11.762 0-15.68l14.559-14.559h-106.39c-6.1602 0-11.199-5.0391-11.199-11.199s5.0391-11.199 11.199-11.199h105.84l-14.559-14.559c-4.4805-4.4805-4.4805-11.762 0-15.68 4.4805-4.4805 11.762-4.4805 15.68 0l33.602 33.602c2.2383 2.2383 3.3594 5.0391 3.3594 7.8398 0.55859 2.793-0.5625 5.5938-2.8047 7.832z' />
        <path d='m415.52 327.6c-13.441-8.9609-30.801-7.2812-42 3.9219l-33.602 33.039c-1.1211 1.1211-3.3594 1.6797-5.0391 1.1211-1.6797-0.55859-2.8008-2.2383-2.8008-4.4805v-202.72c0-17.922-14.559-33.039-33.039-33.039-8.9609 0-16.801 3.3594-23.52 9.5195-6.1602 6.1602-9.5195 14.559-9.5195 23.52v110.32c-5.6016-9.5195-16.238-15.68-28-15.68-17.922 0-33.039 14.559-33.039 33.039v0.55859c-5.6016-9.5195-16.238-15.68-28-15.68-17.922 0-33.039 14.559-33.039 33.039v1.1211c-5.6016-9.5195-16.238-15.68-28-15.68-17.922 0-33.039 14.559-33.039 33.039v90.719c0 29.121 11.199 56 31.922 76.719 20.719 20.719 47.602 31.922 76.719 31.922h51.52c36.961 0 71.68-16.238 95.199-44.801l82.879-100.24c6.1602-7.2812 8.3984-16.801 7.2812-25.762-0.003906-9.5156-5.043-17.918-12.883-23.516z' />
      </g>
    </svg>
  )
}

export default GestureHintIcon
