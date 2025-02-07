import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/12-mark-as-done_3.json'

/** Check Icon Component used for toggleDone with Conditional Lottie Animation. */
const CheckIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%' }}
      >
        <rect width='24' height='24' fill='none' />
        <polyline
          stroke='currentColor'
          fill='none'
          strokeLinecap='round'
          strokeLinejoin='round'
          points='2.28 13.51 7.67 18.91 21.72 4.86'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default CheckIcon
