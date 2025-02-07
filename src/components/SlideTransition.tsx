import { ReactNode } from 'react'
import { CSSTransition } from 'react-transition-group'
import { TransitionProps } from 'react-transition-group/Transition'
import { SlideTransitionRecipeVariant, slideTransitionRecipe } from '../../styled-system/recipes'
import durationsConfig from '../durations.config'
import durations from '../util/durations'

type RemoveFields<Type> = {
  [Property in keyof Type as Exclude<Property, 'timeout' | 'addEndListener'>]: Type[Property]
}

/**
 * Fade animations for transitions.
 */
const SlideTransition = ({
  duration,
  children,
  from,
  id = 0,
  ...props
}: {
  duration: keyof typeof durationsConfig
  id?: string | number
  from: SlideTransitionRecipeVariant['from']
  children: ReactNode
} & RemoveFields<TransitionProps<HTMLElement>>) => {
  const slideClasses = slideTransitionRecipe({ from })
  return (
    <CSSTransition key={id} classNames={slideClasses} timeout={durations.get(duration)} {...props}>
      {children}
    </CSSTransition>
  )
}

export default SlideTransition
