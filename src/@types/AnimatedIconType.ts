import { ReactNode } from 'react'
import IconType from './IconType'

interface AnimatedIconType extends IconType {
  animationData?: object
  children?: ReactNode
}

export default AnimatedIconType
