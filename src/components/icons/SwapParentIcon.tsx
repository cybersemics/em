import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/17-swap-parent.json'

/** SwapParent Icon with Conditional Lottie Animation. */
const SwapParentIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 27'
        style={{ ...style, width: '100%', height: '100%', transform: `translate(0, 7%) scale(1.10, 1.10)` }}
        fill='none'
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M13.05,20.26l-7.52-3.8a6.91,6.91,0,0,1,1-12.72'
          fill='none'
          stroke='currentColor'
          strokeLinejoin='round'
        />
        <path
          d='M11.06,3.4l7.52,3.8a6.91,6.91,0,0,1-1,12.72'
          fill='none'
          stroke='currentColor'
          strokeLinejoin='round'
        />
        <polyline points='12.03 6.38 11.06 3.4 14.04 2.43' fill='none' stroke='currentColor' strokeLinejoin='round' />
        <polyline
          points='10.04 21.29 13.02 20.32 12.05 17.34'
          fill='none'
          stroke='currentColor'
          strokeLinejoin='round'
        />
        <circle cx='12.05' cy='11.83' r='2' fill='currentColor' opacity='0.3' />
        <circle cx='12.05' cy='11.83' r='1.16' fill='currentColor' />
      </svg>
    </AnimatedIcon>
  )
}

export default SwapParentIcon
