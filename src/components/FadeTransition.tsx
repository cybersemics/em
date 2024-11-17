import { ReactNode } from 'react'
import { CSSTransition } from 'react-transition-group'
import { TransitionProps } from 'react-transition-group/Transition'
import { fadeTransition } from '../../styled-system/recipes'
import durations from '../util/durations'

type RemoveFields<Type> = {
  [Property in keyof Type as Exclude<Property, 'timeout' | 'addEndListener'>]: Type[Property]
}

/**
 * Fade animations for transitions.
 */
const FadeTransition = ({
  duration = 'fast',
  children,
  ...props
}: {
  duration?: 'medium' | 'slow' | 'fast' | 'distractionFreeTyping' | 'mediumBoth'
  children: ReactNode
} & RemoveFields<TransitionProps<HTMLElement>>) => {
  const fadeClasses = fadeTransition({ duration })
  const durationKey = duration === 'fast' || duration === 'mediumBoth' ? 'medium' : duration
  return (
    <CSSTransition classNames={fadeClasses} timeout={durations.get(`${durationKey}Duration`)} {...props}>
      {children}
    </CSSTransition>
  )
}

export default FadeTransition
