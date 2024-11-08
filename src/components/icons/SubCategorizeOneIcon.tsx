import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/20-categorize_3.json'

/** Sub Categorize One Icon with Conditional Lottie Animation. */
const SubCategorizeOneIcon = ({ fill, size, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%' }}
        fill='none'
      >
        <circle
          cx='12'
          cy='4.57'
          r='2.5'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle
          cx='12'
          cy='19.43'
          r='2.5'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='12'
          y1='7.07'
          x2='12'
          y2='16.93'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default SubCategorizeOneIcon
