import { FC } from 'react'
import publishMode from '../util/publishMode'

interface ScaleProps {
  amount: number
  origin?: string
  scaleWidth?: boolean
  children?: React.ReactNode
}

/** A container that scales its children by the given amount. */
const Scale: FC<ScaleProps> = ({ amount, origin = '0 0', scaleWidth = true, children }) => (
  // temporarily disable scale in publish mode until #536 is fixed
  <div
    style={{
      transform: `scale(${!publishMode() ? amount : 1})`,
      transformOrigin: origin,
      width: `${100 * (1 / (scaleWidth && !publishMode() ? amount : 1))}%`,
    }}
  >
    {children}
  </div>
)

export default Scale
