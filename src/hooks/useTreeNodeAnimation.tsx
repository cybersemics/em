import { useContext } from 'react'
import { TreeNodeAnimationContext, TreeNodeAnimationContextProps } from '../components/TreeNodeAnimationContext'

/** Custom hook to use the TreeNodeAnimation context. Will throw an error if used outside of a TreeNodeAnimationProvider. */
const useTreeNodeAnimation = (): TreeNodeAnimationContextProps => {
  const context = useContext(TreeNodeAnimationContext)
  if (!context) {
    throw new Error('useTreeNodeAnimation must be used within a TreeNodeAnimationProvider')
  }
  return context
}

export default useTreeNodeAnimation
