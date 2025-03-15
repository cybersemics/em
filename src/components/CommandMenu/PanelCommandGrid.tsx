import React from 'react'
import { css } from '../../../styled-system/css'

interface PanelCommandGridProps {

}

/**
 * Component that displays the grid for the command menu.
 */
const PanelCommandGrid: React.FC<PanelCommandGridProps> = () => {

  return (
    <div
        className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
        })}
    >
    </div>
  )
}

export default PanelCommandGrid
