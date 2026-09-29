import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/33-code.json'

/** Code Icon with Conditional Lottie Animation. */
const CodeIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(1.1, 1.1)` }}
      >
        <rect width='24' height='24' fill='none' />
        <path d='M9,7,4.5,12,9,17' fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M13.5,5.5l-3,13' fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
        <path d='M15,7l4.5,5L15,17' fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    </AnimatedIcon>
  )
}

export default CodeIcon
