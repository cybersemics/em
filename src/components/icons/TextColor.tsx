import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/17-text-color_2.json'

/** TextColor Icon with Conditional Lottie Animation. */
const TextColorIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  const strokeWidth = style.fontWeight === 'bold' ? 1.5 : 1
  return (
    <AnimatedIcon
      {...{
        fill,
        size,
        style: { ...style, backgroundColor: 'transparent' },
        cssRaw,
        animated,
        animationData,
        animationComplete,
      }}
    >
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', backgroundColor: 'transparent' }}
      >
        <rect width='24' height='24' fill='none' />
        <rect
          x='2.73'
          y='2.73'
          width='18.53'
          height='18.53'
          rx='3'
          fill={style.backgroundColor || 'none'}
          stroke={fill}
        />
        <line x1='12' y1='7.2' x2='7.42' y2='16.6' fill='none' stroke='currentColor' strokeWidth={strokeWidth} />
        <line x1='12' y1='7.2' x2='16.58' y2='16.6' fill='none' stroke='currentColor' strokeWidth={strokeWidth} />
        <line x1='8.96' y1='13.44' x2='15.05' y2='13.44' fill='none' stroke='currentColor' strokeWidth={strokeWidth} />
      </svg>
    </AnimatedIcon>
  )
}

export default TextColorIcon
