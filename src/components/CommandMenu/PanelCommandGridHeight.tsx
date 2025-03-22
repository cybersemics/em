import { css } from '../../../styled-system/css'

interface PanelCommandGridHeightProps {
  children: React.ReactNode
}

/** A component that keeps the height of the PanelCommandGrid cohesive when headings are added. */
export function PanelCommandGridHeight({ children }: PanelCommandGridHeightProps) {
  return (
    <div
      className={css({
        gridColumn: 'span 4',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.7rem',
        height: '4rem',
      })}
    >
      {children}
    </div>
  )
}

export default PanelCommandGridHeight
