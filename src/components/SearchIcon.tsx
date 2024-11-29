import IconType from '../@types/IconType'
import AnimatedIcon from './icons/AnimatedIcon'
import animationData from './icons/animations/12-search.json'

/** Search Icon with Conditional Lottie Animation. */
const SearchIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(0, -2%)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M10.15,17.75A7.2,7.2,0,1,0,3,10.55,7.2,7.2,0,0,0,10.15,17.75Z'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
        <path
          d='M21.12,21.52l-4.29-4.29'
          stroke='currentColor'
          strokeLinejoin='round'
          strokeLinecap='round'
          fill='none'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default SearchIcon
