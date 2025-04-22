import { CSSTransition } from 'react-transition-group'
import { TransitionProps } from 'react-transition-group/Transition'
import { FadeTransitionRecipeVariant, fadeTransitionRecipe } from '../../styled-system/recipes'
import durations from '../util/durations'

type RemoveFields<Type> = {
  [Property in keyof Type as Exclude<Property, 'timeout' | 'addEndListener'>]: Type[Property]
}

/**
 * Fade animations for transitions.
 */
const FadeTransition = ({
  duration,
  id = 0,
  children,
  ...props
}: {
  id?: string | number
  duration: FadeTransitionRecipeVariant['duration']
} & RemoveFields<TransitionProps<HTMLElement>>) => {
  const fadeClasses = fadeTransitionRecipe({ duration })
  return (
    <CSSTransition key={id} classNames={fadeClasses} timeout={durations.get(duration)} {...props}>
      {children}
    </CSSTransition>
  )
}

export default FadeTransition
