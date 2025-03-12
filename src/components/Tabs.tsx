import React from 'react'
import { css } from '../../styled-system/css'

/**
 * Represents a single tab's configuration.
 */
export interface TabDefinition<T extends string> {
  value: T
  label?: string
  showDot?: boolean
  children: React.ReactNode
}

/**
 * A tab component that shows its content when active.
 */
const Tab = <T extends string>({
  value,
  label,
  children,
  showDot = false,
  active = false,
  onClick,
}: {
  onClick?: () => void
  active?: boolean
} & TabDefinition<T>) => {
  return (
    <>
      <div
        className={css({
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px 20px',
          gap: '8px',
          height: '100%',
          cursor: 'pointer',
          flex: 'none',
          whiteSpace: 'nowrap',
          ...(active && {
            backgroundColor: 'fgOverlay10',
            borderBottom: '2px solid {colors.link}',
          }),
        })}
        onClick={onClick}
      >
        <span
          className={css({
            fontSize: '1.14em',
            _mobile: { fontSize: '1em' },
            textAlign: 'center',
            color: active ? 'fg' : 'fgOverlay70',
            WebkitTextStrokeWidth: active ? '0.05em' : 0,
          })}
        >
          {label || value}
        </span>
        {showDot && (
          <div
            className={css({
              width: '5px',
              height: '5px',
              borderRadius: 999,
              backgroundColor: 'link',
            })}
          />
        )}
      </div>
    </>
  )
}

/**
 * A container component that renders a row of scrollable tabs and their content.
 * Tabs can be scrolled horizontally on small screens.
 */
const Tabs = <T extends string>({
  currentTab,
  onTabChange,
  tabs,
  className = '',
}: {
  /** Current active tab value. */
  currentTab: T
  /** Handler called when a tab is clicked. */
  onTabChange: (value: T) => void
  /** Array of tab definitions. */
  tabs: TabDefinition<T>[]
  /** Optional className for the container. */
  className?: string
}) => {
  return (
    <div className={className}>
      <div
        className={css({
          boxSizing: 'border-box',
          position: 'relative',
          width: '100%',
          borderBottom: '2px solid {colors.fgOverlay20}',
        })}
      >
        <div
          className={css({
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            marginBottom: '-2px',
          })}
        >
          {tabs.map(({ value, label, showDot, children }) => (
            <Tab
              key={value}
              value={value}
              label={label}
              showDot={showDot}
              active={value === currentTab}
              onClick={() => {
                onTabChange(value)
                window.navigator.vibrate(100)
              }}
            >
              {children}
            </Tab>
          ))}
        </div>
      </div>
      <div>{tabs.find(tab => tab.value === currentTab)?.children}</div>
    </div>
  )
}

export default Tabs
