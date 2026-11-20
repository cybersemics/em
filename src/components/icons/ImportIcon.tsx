import IconType from '../../@types/IconType'
import AnimatedIcon from './AnimatedIcon'

/** Import icon: the Export icon's tray, with the arrow pointing into it. It has no animation, so it is always drawn. */
const ImportIcon = ({ fill, size = 18, style = {}, className }: IconType) => {
  return (
    <AnimatedIcon {...{ fill, size, style, className }}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='none'
        style={{ ...style, width: '100%', height: '100%', transform: `scale(0.96, 0.96)` }}
      >
        <rect width='24' height='24' fill='none' />
        <path
          d='M21,12.83v7.29a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2V12.83'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <line
          x1='11.88'
          y1='2.98'
          x2='11.88'
          y2='15.14'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <polyline
          points='15.79 11.22 11.87 15.14 8.22 11.49'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </AnimatedIcon>
  )
}

export default ImportIcon
