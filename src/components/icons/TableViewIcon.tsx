import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'
import animationData from './animations/09-tabel-view_2.json'

/** TableView Icon with Conditional Lottie Animation. */
const TableViewIcon = ({ fill, size = 18, style = {}, cssRaw, animated, animationComplete }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, cssRaw, animated, animationData, animationComplete }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        style={{ ...style, width: '100%', height: '100%' }}
        fill='none'
      >
        <rect width='24' height='24' fill='none' />
        <rect
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          x='3'
          y='3'
          width='18'
          height='18'
          rx='3'
        />
        <line stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' x1='12' y1='3' x2='12' y2='21' />
        <line stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' x1='3' y1='12' x2='21' y2='12' />
      </svg>
    </AnimatedIcon>
  )
}

export default TableViewIcon
