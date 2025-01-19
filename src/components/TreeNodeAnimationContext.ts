import { createContext } from 'react'

export interface TreeNodeAnimationContextProps {
  isAnimating: boolean
  y: number
}

export const TreeNodeAnimationContext = createContext<TreeNodeAnimationContextProps | undefined>(undefined)
