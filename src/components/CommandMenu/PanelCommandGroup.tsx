import React from 'react'
import { css } from '../../../styled-system/css'

interface PanelCommandGroupProps {
  children: React.ReactNode
}

/** A component that groups two PanelCommand components together. */
const PanelCommandGroup: React.FC<PanelCommandGroupProps> = ({ children }) => {
  const childCount = React.Children.count(children)

  // Determine the size from the first child
  const firstChild = React.Children.toArray(children)[0] as React.ReactElement
  const size = firstChild.props.size

  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'stretch',
        gridColumn:
          childCount === 2 && size === 'medium'
            ? 'span 4'
            : childCount === 3 && size === 'medium'
              ? 'span 4'
              : `span ${childCount}`,
      })}
    >
      {React.Children.map(children, (child, index) => (
        <div
          className={css({
            display: 'flex',
            borderRadius: index === 0 ? '16px 0 0 16px' : index === childCount - 1 ? '0 16px 16px 0' : '0', //rounded corners on first and last child
            flex: 1,
            marginLeft: index > 0 ? '5px' : '0',
            backgroundColor: '{colors.gray15}',
            justifyContent: 'center',
          })}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

export default PanelCommandGroup
