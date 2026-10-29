import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import IconType from '../@types/IconType'

/** An outline of the icon's bounds that stands in for the icon of a stub command, so that a snapshot of a command list covers the position of an icon without changing whenever a real icon is redrawn. See testFlags.stubCommands. */
const StubIcon = ({ className, fill, size, style }: IconType) => {
  const sizeCalculated = useSelector(state => size || state.fontSize)
  return (
    <span role='img' aria-label='stub'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width={sizeCalculated}
        height={sizeCalculated}
        viewBox='0 0 24 24'
        className={cx(className, css({ width: '24px' }))}
        fill='none'
        stroke={fill || token('colors.fg')}
        style={{ height: sizeCalculated, width: sizeCalculated, ...style }}
      >
        <rect x='1' y='1' width='22' height='22' strokeWidth='2' />
      </svg>
    </span>
  )
}

export default StubIcon
