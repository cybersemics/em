import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/26-device-management_2.json'

/** Device Icon with Conditional Lottie Animation. */
const DeviceIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
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
          d='M8.25,6.22v-2a2.44,2.44,0,0,1,2.44-2.44h8.45a2.44,2.44,0,0,1,2.44,2.44v12.3a2.44,2.44,0,0,1-2.44,2.44H12.39'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <rect
          x='2.81'
          y='6.22'
          width='9.58'
          height='16.12'
          rx='2'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='2.81'
          y1='18.38'
          x2='12.39'
          y2='18.38'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='2.81'
          y1='8.94'
          x2='12.39'
          y2='8.94'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='7.6'
          y1='20.39'
          x2='7.6'
          y2='20.39'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='14.91'
          y1='15.96'
          x2='14.91'
          y2='15.96'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='15.56'
          y1='4.36'
          x2='14.26'
          y2='4.36'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default DeviceIcon
