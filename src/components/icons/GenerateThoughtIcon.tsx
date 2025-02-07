import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/29-generate-thought_2.json'

/** Generate Thought Icon with Conditional Lottie Animation. */
const GenerateThoughtIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(5%, 0) scale(0.96, 0.96)' }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M2.37,20.87a2.12,2.12,0,0,0,3,0l13-13a2.12,2.12,0,1,0-3-3l-13,13A2.12,2.12,0,0,0,2.37,20.87Z'
          stroke='currentColor'
          strokeLinejoin='round'
          fill='none'
        />
        <path d='M16.88,9.36l-3-3' stroke='currentColor' strokeLinecap='round' fill='none' />
        <path
          d='M7.37,2.81l1.5-.44-.44,1.5.44,1.5-1.5-.44-1.5.44.44-1.5-.44-1.5Z'
          stroke='currentColor'
          strokeMiterlimit='10'
          strokeWidth='0.75'
          fill='none'
          strokeLinecap='round'
        />
        <path
          d='M3.37,8.81l1.5-.44-.44,1.5.44,1.5-1.5-.44-1.5.44.44-1.5-.44-1.5Z'
          stroke='currentColor'
          strokeMiterlimit='10'
          strokeWidth='0.75'
          fill='none'
          strokeLinecap='round'
        />
        <path
          d='M18.37,13.81l1.5-.44-.44,1.5.44,1.5-1.5-.44-1.5.44.44-1.5-.44-1.5Z'
          stroke='currentColor'
          strokeMiterlimit='10'
          strokeWidth='0.75'
          fill='none'
          strokeLinecap='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default GenerateThoughtIcon
