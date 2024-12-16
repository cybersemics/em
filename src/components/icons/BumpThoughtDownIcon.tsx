import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/14-bump-thought-down_2.json'

/** Bump Thought Down Icon with Conditional Lottie Animation. */
const BumpThoughtDownIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `translate(-1%, 2%)` }}
      >
        <rect fill='none' width='24' height='24' />
        <circle stroke='currentColor' strokeLinejoin='round' fill='none' cx='20.07' cy='18.08' r='2.49' />
        <line stroke='currentColor' strokeLinejoin='round' fill='none' x1='19.31' y1='15.13' x2='19.21' y2='14.64' />
        <path
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
          d='M18.94,13.2l-.52-2.73a1.73,1.73,0,0,0-3.35-.21l-2,6.19'
          strokeDasharray='0.97 1.46'
        />
        <polyline
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
          points='12.85 17.14 12.7 17.62 12.62 17.12'
        />
        <path
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
          d='M12.39,15.71,11,6.81a1.57,1.57,0,0,0-3.1,0l-1.5,9.59'
          strokeDasharray='0.96 1.43'
        />
        <polyline stroke='currentColor' strokeLinejoin='round' fill='none' points='6.27 17.12 6.19 17.62 6.13 17.12' />
        <path
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
          d='M5.94,15.62l-1-8.44A5.39,5.39,0,0,0,1.42,2.79'
          strokeDasharray='1.01 1.51'
        />
        <path stroke='currentColor' strokeLinejoin='round' fill='none' d='M.69,2.58.2,2.5' />
      </svg>
    </AnimatedIcon>
  )
}

export default BumpThoughtDownIcon
