import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import Icon from '../../@types/IconType'

/** Meta icon that shows code under a magnifying glass. */
// https://thenounproject.com/icon/inspect-element-4199164/
// Runners up:
// https://thenounproject.com/icon/inspect-element-1018637/
// https://thenounproject.com/icon/search-486819/
// https://thenounproject.com/icon/search-document-486836/
const MetaIcon: FC<Icon> = ({ cssRaw, fill, style, size = 20 }) => {
  return (
    <svg
      x='0'
      y='0'
      viewBox='100 60 550 550'
      className={cx(iconRecipe(), css(cssRaw))}
      width={size}
      height={size}
      fill={fill || token('colors.fg')}
      style={{ ...style }}
    >
      <g>
        <path d='m477.82 362.93c-8.7734-8.7734-22.539-9.4727-32.246-2.1914l-19.367-19.367c25.48-29.027 40.926-67.059 40.926-108.59 0-91-74.012-165.01-165.01-165.01s-164.97 73.965-164.97 164.96 74.012 165.01 165.01 165.01c42.699 0 81.668-16.332 111.02-43.027l19.086 19.086c-3.8281 4.4805-6.0195 10.035-6.0195 15.961 0 6.5781 2.5664 12.785 7.2344 17.453l77.793 77.84c4.8086 4.8086 11.152 7.2344 17.453 7.2344s12.648-2.4258 17.453-7.2344l9.3789-9.3789c4.668-4.668 7.2344-10.875 7.2344-17.453s-2.5664-12.785-7.2344-17.453zm-322-130.2c0-80.688 65.66-146.35 146.35-146.35s146.35 65.66 146.35 146.35c-0.003906 80.688-65.707 146.35-146.39 146.35s-146.3-65.66-146.3-146.35zm386.59 229.74-9.3789 9.3789c-2.332 2.332-6.207 2.332-8.5391 0l-77.797-77.836c-1.1211-1.168-1.7734-2.6602-1.7734-4.293 0-1.6328 0.60547-3.125 1.7734-4.293l9.3789-9.3789c1.168-1.168 2.707-1.7734 4.293-1.7734 1.5859 0 3.0781 0.60547 4.293 1.7734l77.793 77.84c1.1211 1.168 1.7734 2.6602 1.7734 4.293 0.003906 1.6328-0.64844 3.1719-1.8164 4.2891z' />
        <path d='m244.54 198.52c4.1055-3.125 4.9453-8.9609 1.8203-13.066s-8.9609-4.9453-13.066-1.8203l-45.035 33.973c-4.3867 3.3125-7.0469 8.9609-7.0469 15.027 0 6.1133 2.6133 11.762 7 15.074l44.941 34.16c1.6797 1.2617 3.6875 1.9141 5.6484 1.9141 2.8008 0 5.6016-1.2617 7.4219-3.6875 3.125-4.1055 2.332-9.9414-1.7734-13.066l-44.52-33.832c-0.046875-0.28125-0.046875-0.69922 0-1.0273z' />
        <path d='m329.98 182.93c-4.4805-2.5195-10.172-0.98047-12.738 3.5l-47.184 83.301c-2.5195 4.4805-0.98047 10.172 3.5 12.738 1.4453 0.83984 3.0352 1.2148 4.5742 1.2148 3.2656 0 6.3945-1.6797 8.1211-4.7148l47.227-83.254c2.5664-4.5273 1.0273-10.219-3.5-12.785z' />
        <path d='m423.08 232.82c0-6.1133-2.6133-11.762-7-15.074l-44.941-34.16c-4.1055-3.125-9.9414-2.332-13.066 1.7734s-2.332 9.9414 1.7734 13.066l44.52 33.832c0.046875 0.28125 0.046875 0.69922 0 1.0273l-44.613 33.648c-4.1055 3.125-4.9453 8.9609-1.8203 13.066 1.8203 2.4258 4.6211 3.6875 7.4648 3.6875 1.9609 0 3.9219-0.60547 5.6016-1.8672l45.035-33.973c4.3906-3.3125 7.0039-8.9609 7.0469-15.027z' />
      </g>
    </svg>
  )
}

export default MetaIcon
