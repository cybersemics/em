import { ReactNode } from 'react'
import IconType from './IconType'
import LottieData from './lottie/LottieData'

interface AnimatedIconType extends IconType {
  animationData?: LottieData | null
  children?: ReactNode
}

export default AnimatedIconType
