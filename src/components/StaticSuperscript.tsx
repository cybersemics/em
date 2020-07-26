import React from 'react'
import { animated, useTransition } from 'react-spring'
import { GenericObject } from '../utilTypes'

/** Renders a given number as a superscript. */
const StaticSuperscript = ({ n } : { n: number}) => {

  const transitions = useTransition([n], {
    key: (n: number) => n,
    from: { opacity: 0, y: 7 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: -7 },
  })

  return (
    transitions((props: GenericObject, n: number) => {
      return (
        <animated.div key={n} style={{ ...props }}>
          <span className='superscript-container'>
            <span className='num-contexts'>
              <sup>{n}</sup>
            </span>
          </span>
        </animated.div>
      )
    })
  )
}

export default StaticSuperscript
