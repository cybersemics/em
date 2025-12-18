/**
 * Simple View component that replaces react-native-web's View.
 * This is just a div wrapper that can accept panHandlers from PanResponder.
 */
import React, { HTMLAttributes } from 'react'

interface ViewProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

/**
 * A simple View component that renders a div.
 * This replaces react-native-web's View component.
 * The panHandlers from PanResponder can be spread onto this component.
 */
const View: React.FC<ViewProps> = ({ children, ...props }) => {
  return <div {...props}>{children}</div>
}

export default View
