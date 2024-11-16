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
  duration = 'medium',
  children,
  ...props
}: {
  duration?: 'medium' | 'slow'
  children: ReactNode
} & RemoveFields<TransitionProps<HTMLElement>>) => {
  const { enter, exit, enterActive, exitActive } = fadeTransition({ duration })
  return (
    <CSSTransition
      classNames={{
        enter,
        exit,
        exitActive,
        enterActive,
      }}
      timeout={durations.get(`${duration}Duration`)}
      {...props}
    >
      {children}
    </CSSTransition>
  )
}

export default FadeTransition
