import { createContext } from 'react'

export interface TreeNodeAnimationContextProps {
  isAnimating: boolean
  setIsAnimating: (isAnimating: boolean) => void
  y: number
}

export const TreeNodeAnimationContext = createContext<TreeNodeAnimationContextProps | undefined>(undefined)
