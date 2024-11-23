import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/25-export_2.json'

/** Share Icon with Conditional Lottie Animation. */
const ShareIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(0.96, 0.96)` }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M21,12.83v7.29a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2V12.83'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='11.88'
          y1='15.14'
          x2='11.88'
          y2='2.98'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <polyline
          points='15.79 5.89 11.87 1.97 8.22 5.62'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default ShareIcon
