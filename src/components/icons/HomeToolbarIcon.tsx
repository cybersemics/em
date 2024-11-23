import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/11-home.json'

/** HomeToolbar Icon with Conditional Lottie Animation. */
const HomeToolbarIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(-1%, 5%) scale(0.98, 0.98)' }}
      >
        <rect width='24' height='24' fill='none' />
        <polygon
          points='20.88 21.25 20.88 8.89 12.22 2.06 3.56 8.89 3.56 21.25 20.88 21.25'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
        <path
          d='M9.87,21.25V16.61a2.35,2.35,0,0,1,2.35-2.35h0a2.35,2.35,0,0,1,2.35,2.35v4.64'
          stroke='currentColor'
          strokeMiterlimit='10'
          fill='none'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default HomeToolbarIcon
