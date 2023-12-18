import { CSSProperties } from 'react'

interface LoaderProps {
  size?: number
  style?: CSSProperties
}

/**
 * Loading component.
 */
const Loader = ({ size = 32, style }: LoaderProps) => {
  return (
    <div className='ripple_loader_container' style={{ ...style, height: size, width: size }}>
      <div className='ripple_loader'>
        <div></div>
        <div></div>
      </div>
    </div>
  )
}
export default Loader
