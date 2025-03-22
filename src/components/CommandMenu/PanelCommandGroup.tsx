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
  const size = firstChild.props.size ?? 'small'

  return (
    <div
      className={css({
        display: 'grid',
        alignItems: 'stretch',
      })}
      style={{
        gridColumn: childCount === 2 && size === 'medium' ? 'span 4' : `span ${childCount}`,
        gridTemplateColumns: childCount === 2 && size === 'medium' ? '1fr 1fr' : `repeat(${childCount}, 1fr)`,
      }}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            className: css({
              borderRadius: index === 0 ? '16px 0 0 16px' : index === childCount - 1 ? '0 16px 16px 0' : '0',
              flex: 1,
              marginLeft: index > 0 ? '5px' : '0',
              justifyContent: 'center',
              gridColumn: 'span 1 !important'
            }),
          } as any)
        }
        return null
      })}
    </div>
  )
}

export default PanelCommandGroup
