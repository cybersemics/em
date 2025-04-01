import React, { PropsWithChildren } from 'react'
import { css, cx } from '../../../styled-system/css'
import { panelCommandGroupRecipe } from '../../../styled-system/recipes'

/** A component that groups two PanelCommand components together. */
const PanelCommandGroup: React.FC<PropsWithChildren> = ({ children }) => {
  const childCount = React.Children.count(children)

  // Determine the size from the first child
  const firstChild = React.Children.toArray(children)[0] as React.ReactElement
  const size = firstChild.props.size ?? 'small'

  return (
    <div
      className={cx(
        css({
          display: 'grid',
          alignItems: 'stretch',
        }),
        panelCommandGroupRecipe({
          layout:
            childCount === 2 && size === 'medium'
              ? 'medium-2'
              : (`small-${childCount}` as 'small-2' | 'small-3' | 'small-4'),
        }),
      )}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement, {
            className: css({
              borderRadius: index === 0 ? '16px 0 0 16px' : index === childCount - 1 ? '0 16px 16px 0' : '0',
              flex: 1,
              marginLeft: index > 0 ? '5px' : '0',
              justifyContent: 'center',
              ...(childCount === 2 &&
                size === 'medium' && {
                  gridColumn: 'span 1 !important',
                }),
            }),
          })
        }
        return null
      })}
    </div>
  )
}

export default PanelCommandGroup
