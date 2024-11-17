import { ReactNode } from 'react'
import { CSSTransition } from 'react-transition-group'
import { TransitionProps } from 'react-transition-group/Transition'
import { FadeTransitionVariant, fadeTransition } from '../../styled-system/recipes'
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
  duration: FadeTransitionVariant['duration']
  children: ReactNode
} & RemoveFields<TransitionProps<HTMLElement>>) => {
  const fadeClasses = fadeTransition({ duration })
  const durationKey = duration === 'mediumBoth' ? 'medium' : duration
  return (
    <CSSTransition key={id} classNames={fadeClasses} timeout={durations.get(`${durationKey}Duration`)} {...props}>
      {children}
    </CSSTransition>
  )
}

export default FadeTransition
