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
      {children}
    </div>
  )
}

export default PanelCommandGroup
