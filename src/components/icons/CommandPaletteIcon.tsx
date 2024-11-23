import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/27-command-palette.json'

/** CommandPalette Icon with Conditional Lottie Animation. */
const CommandPaletteIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(1%, 0)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M15.41,12v6.25a2.71,2.71,0,1,0,2.7-2.71H5.48a2.71,2.71,0,1,0,2.71,2.71V5.62A2.71,2.71,0,1,0,5.48,8.33H18.11a2.71,2.71,0,1,0-2.7-2.71Z'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default CommandPaletteIcon
