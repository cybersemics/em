import React from 'react'
import { css } from '../../../styled-system/css'

interface PanelCommandGroupProps {
  children: React.ReactNode
}

/** A component that groups two PanelCommand components together. */
const PanelCommandGroup: React.FC<PanelCommandGroupProps> = ({ children }) => {
  return (
    <div
      className={css({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem',
        borderRadius: '16px',
        backgroundColor: '{colors.gray15}',
      })}
    >
      {children}
    </div>
  )
}

export default PanelCommandGroup
