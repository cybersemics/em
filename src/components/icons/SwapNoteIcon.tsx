import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/24-convert-to-note.json'

/** Swap Note Icon with Conditional Lottie Animation. */
const SwapNoteIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%', transform: 'translate(1%, 1%) scale(0.96, 0.96)' }}
        fill='none'
      >
        <rect width='24' height='24' fill='none' />
        <polyline points='10.24 12.09 8.74 10.59 7.24 12.09' fill='none' stroke='currentColor' strokeLinejoin='round' />
        <path
          d='M12.93,17.61h0A3.65,3.65,0,0,1,8.74,14V10.59'
          fill='none'
          stroke='currentColor'
          strokeLinejoin='round'
        />
        <polyline
          points='13.74 12.98 15.24 14.48 16.74 12.98'
          fill='none'
          stroke='currentColor'
          strokeLinejoin='round'
        />
        <path
          d='M11.05,7.46h0a3.65,3.65,0,0,1,4.19,3.61v3.41'
          fill='none'
          stroke='currentColor'
          strokeLinejoin='round'
        />
        <path
          d='M8.14,2v3a1,1,0,0,1-1,1H4'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M8.48,2H18.75a1,1,0,0,1,1,1V20.41a1,1,0,0,1-1,1H4.92a1,1,0,0,1-1-1v-14a3,3,0,0,1,.24-1.18h0a5.52,5.52,0,0,1,3-2.95l.2-.08A3.06,3.06,0,0,1,8.48,2Z'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default SwapNoteIcon
