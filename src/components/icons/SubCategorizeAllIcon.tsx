import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/21-categorize-all_5.json'

/** Sub Categorize All Icon with Conditional Lottie Animation. */
const SubCategorizeAllIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{
          ...style,
          width: '100%',
          height: '100%',
          transform: `translate(0, 4%) scale(0.98, 0.98)`,
        }}
        fill='none'
      >
        <path
          d='M7.19,5.84V18A2.62,2.62,0,0,0,9.82,20.6h4.8'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle
          cx='7.19'
          cy='3.64'
          r='1.95'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle
          cx='16.81'
          cy='20.6'
          r='1.95'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M7.19,6.28V9.8a2.63,2.63,0,0,0,2.63,2.63h4.8'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle
          cx='16.81'
          cy='12.43'
          r='1.95'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default SubCategorizeAllIcon
