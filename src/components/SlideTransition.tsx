import { CSSTransition } from 'react-transition-group'
import { TransitionProps } from 'react-transition-group/Transition'
import { SlideTransitionRecipeVariant, slideTransitionRecipe } from '../../styled-system/recipes'
import durations, { type Duration } from '../util/durations'

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
  duration: Duration
  id?: string | number
  from: SlideTransitionRecipeVariant['from']
} & RemoveFields<TransitionProps<HTMLElement>>) => {
  const slideClasses = slideTransitionRecipe({ from })
  return (
    <CSSTransition key={id} classNames={slideClasses} timeout={durations.get(duration)} {...props}>
      {children}
    </CSSTransition>
  )
}

export default SlideTransition
