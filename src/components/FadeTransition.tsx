import { PropsWithChildren, useRef } from 'react'
import { CSSTransition } from 'react-transition-group'
import { TransitionProps } from 'react-transition-group/Transition'
import { FadeTransitionRecipeVariant, fadeTransitionRecipe } from '../../styled-system/recipes'
import durations from '../util/durations'

type RemoveFields<Type> = {
  [Property in keyof Type as Exclude<Property, 'timeout' | 'addEndListener'>]: Type[Property]
}

/**
 * Fade animations for transitions defined in recipes/fadeTransition.
 * This component uses `react-transition-group` to apply CSS transitions based on the provided type.
 */
const FadeTransition = ({
  type,
  id = 0,
  children,
  ...props
}: PropsWithChildren<
  {
    /**
     * Unique identifier for the transition, useful for React keys.
     * Defaults to 0.
     */
    id?: string | number
    /** The type of fade transition, which determines both duration and easing. Corresponds to variants in recipes/fadeTransition. Basic transitions such as "fast", "medium", or "slow" use ease-out or ease, while specialized transitions such as "disappearingUpperRight" use custom easing functions. */
    type: FadeTransitionRecipeVariant['type']
    /*
      Optionally override the nodeRef that is passed to CSSTransition. If CSSTransition's nodeRef property is not explicitly provided, it will result in a findDOMNode deprecation warning. In order to avoid making the parent provide the ref every time, we wrap the children in a <span> and use that as the nodeRef by default.

      See: https://reactcommunity.org/react-transition-group/transition#Transition-prop-nodeRef.
    */
    nodeRef?: TransitionProps<HTMLElement>['nodeRef']
    /** Unmount the component when the transition ends. Note that this must be specified for components to start hidden, because CSSTransition does not apply the exit styles on mount, even when `in={false}`. Supposedly you can apply default styles independently from the enter/exit classes, but I have not figured out how. See: https://github.com/reactjs/react-transition-group/issues/576. */
    unmountOnExit?: boolean
  } & RemoveFields<TransitionProps<HTMLElement>>
>) => {
  const fadeClasses = fadeTransitionRecipe({ type })
  const ref = useRef<HTMLDivElement>(null)

  return (
    <CSSTransition
      key={id}
      classNames={fadeClasses}
      timeout={durations.get(type)}
      // This would get overridden by {...props} anyway, but make it explicit for clarity.
      nodeRef={props.nodeRef ?? ref}
      {...props}
    >
      {props.nodeRef ? (
        // If a nodeRef was provided, render children directly. Some components like ContextBreadcrumbs rely on the DOM hierarchy and will break if wrapped in a span. This can be removed if we refactor those components to not rely on the DOM hierarchy.
        children
      ) : (
        // Otherwise, wrap the children in a span with the internal ref to avoid findDOMNode deprecation warnings.
        <span ref={ref}>{children}</span>
      )}
    </CSSTransition>
  )
}

export default FadeTransition
