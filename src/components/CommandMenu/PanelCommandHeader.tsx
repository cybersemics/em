import React from 'react'
import { css } from '../../../styled-system/css'

interface PanelCommandHeaderProps {
  title: string
}

/**
 * A header component for the command panel that spans all columns.
 */
const PanelCommandHeader: React.FC<PanelCommandHeaderProps> = ({ title }) => {
    return (
      <div
        className={css({
          gridColumn: 'span 4',
          alignSelf: 'end',
          height: 'auto',
        })}
      >
        <h2
          className={css({
            fontWeight: 'bold',
            color: '{colors.fg}',
            margin: '1.3rem 0 0.2rem',
            fontSize: '1rem',
            borderBottom: 'none',
          })}
        >
          {title}
        </h2>
      </div>
    )
  }

export default PanelCommandHeader
