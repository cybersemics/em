import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/27-settings_2.json'

/** Settings Icon with Conditional Lottie Animation. */
const SettingsIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'scale(0.96, 0.96)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M10.19,20.38,10,20.7a1.51,1.51,0,0,1-2,.54l-1.9-1.1a1.49,1.49,0,0,1-.55-2l.17-.31a1.47,1.47,0,0,0,0-1.55,6.06,6.06,0,0,1-.45-.78,1.48,1.48,0,0,0-1.33-.82H3.53A1.5,1.5,0,0,1,2,13.14v-2.2a1.5,1.5,0,0,1,1.5-1.5h.33a1.48,1.48,0,0,0,1.33-.81,6.06,6.06,0,0,1,.45-.78,1.49,1.49,0,0,0,0-1.56L5.51,6a1.5,1.5,0,0,1,.55-2.05L8,2.84A1.5,1.5,0,0,1,10,3.39l.18.32a1.47,1.47,0,0,0,1.37.73h.88a1.51,1.51,0,0,0,1.39-.77L14,3.4A1.51,1.51,0,0,1,16,2.84l1.91,1.1A1.5,1.5,0,0,1,18.49,6l-.18.3a1.49,1.49,0,0,0,0,1.56,7.52,7.52,0,0,1,.45.78,1.47,1.47,0,0,0,1.32.81h.36a1.5,1.5,0,0,1,1.5,1.5v2.2a1.5,1.5,0,0,1-1.5,1.5h-.36a1.46,1.46,0,0,0-1.32.82,8.57,8.57,0,0,1-.45.77,1.49,1.49,0,0,0,0,1.56l.18.3a1.5,1.5,0,0,1-.55,2.05L16,21.24A1.51,1.51,0,0,1,14,20.69l-.15-.27a1.52,1.52,0,0,0-1.39-.78h-.88A1.5,1.5,0,0,0,10.19,20.38Z'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle
          cx='12'
          cy='12.04'
          r='3.19'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default SettingsIcon
