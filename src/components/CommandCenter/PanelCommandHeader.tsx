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
        margin: '1.156rem 0 0.178rem',
        '&:first-child': {
          marginTop: 0,
        },
      })}
    >
      <h2
        className={css({
          fontWeight: 'bold',
          color: 'fg',
          margin: '0',
          fontSize: '0.889rem',
          borderBottom: 'none',
        })}
      >
        {title}
      </h2>
    </div>
  )
}

export default PanelCommandHeader
