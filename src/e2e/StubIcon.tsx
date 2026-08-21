import IconType from '../@types/IconType'
import { ICON_SCALING_FACTOR } from '../constants'

/** A generic icon for the stub commands. Unlike the real icons, it never animates, otherwise the icon of the selected command would be captured mid-animation. */
const StubIcon = ({ fill, size = 18, style = {} }: IconType) => {
  const sizeScaled = size * ICON_SCALING_FACTOR
  return (
    <svg width={sizeScaled} height={sizeScaled} viewBox='0 0 24 24' style={style}>
      <circle cx='12' cy='12' r='9' stroke={fill || 'currentColor'} fill='none' />
    </svg>
  )
}

export default StubIcon
