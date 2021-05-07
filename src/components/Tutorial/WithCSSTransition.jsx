import React from 'react'
import { CSSTransition } from 'react-transition-group'

/** Wrap a component in a slide CSS transition. */
const WithCSSTransition = ({ component: Component, ...props }) => {
  return (
    <CSSTransition in={true} key={Math.floor(props.step)} timeout={400} classNames='slide'>
      <div>
        <Component {...props} />
      </div>
    </CSSTransition>
  )
}

export default WithCSSTransition
