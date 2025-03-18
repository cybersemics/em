import React from 'react'
import { css } from '../../../styled-system/css'

interface PanelCommandGroupProps {
  children: React.ReactNode
  size?: 'small' | 'medium' | 'large' 
}

/** A component that groups two PanelCommand components together. */
const PanelCommandGroup: React.FC<PanelCommandGroupProps> = ({ children, size }) => {
  const childCount = React.Children.count(children)

  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gridColumn: `span ${Math.min(childCount, 4)}`,
      })}
    >
      {React.Children.map(children, (child, index) => (
        <div
          className={css({
            borderRadius: index === 0 ? '16px 0 0 16px' : index === childCount - 1 ? '0 16px 16px 0' : '0',
            flex: 1,
            marginLeft: index > 0 ? '10px' : '0',
            padding: size === 'small' ? '0.3rem' : '0.5rem',
            backgroundColor: '{colors.gray15}',
          })}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

export default PanelCommandGroup
