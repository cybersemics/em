import React, { PropsWithChildren } from 'react'
import { css, cx } from '../../../styled-system/css'
import { panelCommandGroupRecipe } from '../../../styled-system/recipes'

/** A component that groups two PanelCommand components together. */
const PanelCommandGroup: React.FC<PropsWithChildren<{ commandSize: 'small' | 'medium'; commandCount: number }>> = ({
  children,
  commandSize,
  commandCount,
}) => {
  // This variable determines the size of the commands inside the group.
  const size = commandSize ?? 'small'

  return (
    <div
      className={cx(
        css({
          display: 'grid',
          alignItems: 'stretch',
          gap: 'inherit',
        }),
        panelCommandGroupRecipe({
          layout:
            commandCount === 2 && size === 'medium'
              ? 'medium-2'
              : (`small-${commandCount}` as 'small-2' | 'small-3' | 'small-4'),
        }),
      )}
    >
      {children}
    </div>
  )
}

export default PanelCommandGroup
