import { ReactNode } from 'react'
import IconType from './IconType'
import LottieData from './LottieTypes'

interface AnimatedIconType extends IconType {
  animationData?: LottieData | null
  children?: ReactNode
}

export default AnimatedIconType
