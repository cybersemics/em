import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/15-underline_2.json'

/** Underline Icon with Conditional Lottie Animation. */
const UnderlineIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{
          ...style,
          width: '100%',
          height: '100%',
          transform: `scale(0.98, 0.98)`,
        }}
      >
        <rect width='24' height='24' fill='none' />
        <path d='M4.84,20.89H19.16' fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
        <path
          d='M4.84,2.49v8.17a7.16,7.16,0,0,0,14.32,0V2.49'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default UnderlineIcon
