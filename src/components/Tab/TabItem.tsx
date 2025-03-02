import React from 'react'
import { css } from '../../../styled-system/css'

export interface TabItemProps {
  value: string
  children: React.ReactNode
  label?: string
  showDot?: boolean
  onClick?: () => void
  /** Set by the <Tab> component. Do not set manually. */
  active?: boolean
}

/**
 * A tab item component that shows its content when active.
 */
const TabItem: React.FC<TabItemProps> = ({ value, children, label, showDot = false, active = false, onClick }) => {
  return (
    <>
      <div
        className={css({
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px 20px',
          gap: '8px',
          height: '51px',
          cursor: 'pointer',
          ...(active && {
            backgroundColor: 'fgOverlay10',
            borderBottom: '2px solid',
            borderColor: 'link',
          }),
        })}
        onClick={onClick}
      >
        <span
          className={css({
            fontSize: '16px',
            lineHeight: '19px',
            textAlign: 'center',
            color: active ? 'fg' : 'fgOverlay70',
            fontWeight: active ? 700 : 400,
          })}
        >
          {label || value}
        </span>
        {showDot && (
          <div
            className={css({
              width: '5px',
              height: '5px',
              borderRadius: 'full',
              backgroundColor: 'link',
            })}
          />
        )}
      </div>
      {active && children}
    </>
  )
}

export default TabItem
