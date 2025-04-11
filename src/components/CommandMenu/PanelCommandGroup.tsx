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
          gap: '3px',
        }),
        panelCommandGroupRecipe({
          layout:
            childCount === 2 && size === 'medium'
              ? 'medium-2'
              : (`small-${childCount}` as 'small-2' | 'small-3' | 'small-4'),
        }),
      )}
    >
      {
        /** Clone each of the children and set the position attribute to 'first', 'last'
         * or 'between' depending on the index of the child. PanelCommand will use this
         * property to change the styling of the button.
         */

        React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement, {
              groupPosition: index === 0 ? 'first' : index === childCount - 1 ? 'last' : 'between',
            })
          }
          return null
        })
      }
    </div>
  )
}

export default PanelCommandGroup
