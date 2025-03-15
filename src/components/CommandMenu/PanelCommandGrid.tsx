import { css } from '../../../styled-system/css'

/**
 * Component that displays the grid for the command menu.
 */
const PanelCommandGrid = () => {
  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
      })}
    ></div>
  )
}

export default PanelCommandGrid
