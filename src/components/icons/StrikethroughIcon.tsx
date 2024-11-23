import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/16-strikethrough_3.json'

/** Strikethrough Icon with Conditional Lottie Animation. */
const StrikethroughIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(0.98, 0.98)` }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M18.49,6.44a5,5,0,0,0-1-2.25,5.54,5.54,0,0,0-2.2-1.67,7.54,7.54,0,0,0-3.09-.59A6.93,6.93,0,0,0,7.69,3.28a4,4,0,0,0-1.5,2.55,3.72,3.72,0,0,0,.17,1.9,5.05,5.05,0,0,0,.26.59,6.08,6.08,0,0,0,2.56,2.41c.16.09.31.18.48.26.83.4,1.67.76,2.51,1.12l1.79.78c.29.12.57.26.84.39a10.19,10.19,0,0,1,1.88,1.22A5.21,5.21,0,0,1,18,16.09a4.49,4.49,0,0,1,.31.71,4.32,4.32,0,0,1,.12,2A3.83,3.83,0,0,1,17,21.27a7.4,7.4,0,0,1-4.64,1.3A8.89,8.89,0,0,1,9,22,6.26,6.26,0,0,1,6.6,20.32a4.82,4.82,0,0,1-1.16-2.15'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='2.52'
          y1='11.67'
          x2='21.48'
          y2='11.67'
          fill='none'
          stroke='currentColor'
          strokeWidth='0.75px'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default StrikethroughIcon
