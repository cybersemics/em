import { View } from 'moti'
import React from 'react'

import { fadeIn } from '../../style/animations'
const { from, animate } = fadeIn

interface IComponentProps {
  component: React.ElementType
}
/** Wrap a component in a slide CSS transition. */
const WithCSSTransition = ({ component: Component, ...props }: IComponentProps) => {
  return (
    <View
      from={from}
      animate={animate}
      transition={{
        type: 'timing',
        duration: 400,
      }}
      exit={{
        opacity: 0.5,
      }}
    >
      <Component {...props} />
    </View>
  )
}

export default WithCSSTransition
