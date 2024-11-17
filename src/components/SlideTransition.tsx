import { ReactNode } from 'react'
import { CSSTransition } from 'react-transition-group'
import { TransitionProps } from 'react-transition-group/Transition'
import { slideTransition } from '../../styled-system/recipes'
import { SlideTransitionVariant } from '../../styled-system/recipes'
import durationsConfig from '../durations.config'
import durations from '../util/durations'

type RemoveFields<Type> = {
  [Property in keyof Type as Exclude<Property, 'timeout' | 'addEndListener'>]: Type[Property]
}

const fromToDurations: Record<SlideTransitionVariant['from'], keyof typeof durationsConfig> = {
  right: 'fastDuration',
  down: 'veryFastDuration',
  screenRight: 'fastDuration',
}

/**
 * Fade animations for transitions.
 */
const SlideTransition = ({
  duration = 'fast',
  children,
  from,
  id = 0,
  ...props
}: {
  id?: string | number
  from: SlideTransitionVariant['from']
  children: ReactNode
} & RemoveFields<TransitionProps<HTMLElement>>) => {
  const slideClasses = slideTransition({ from })
  return (
    <CSSTransition key={id} classNames={slideClasses} timeout={durations.get(fromToDurations[from])} {...props}>
      {children}
    </CSSTransition>
  )
}

export default SlideTransition
