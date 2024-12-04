import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
// TODO: Replace with a new icon and animation for code.
import animationData from './animations/13-bold_4.json'

/** Code icon. */
const CodeIcon = ({ fill, size, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M6,4a.94.94,0,0,1,.94-.94h5.53a4.58,4.58,0,0,1,4.62,4A4.45,4.45,0,0,1,12.66,12H6Z'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
        />
        <path
          d='M6,12h7.84A4.29,4.29,0,0,1,18,16a4.3,4.3,0,0,1-4,4.89H6.83A.89.89,0,0,1,6,20V12Z'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default CodeIcon
