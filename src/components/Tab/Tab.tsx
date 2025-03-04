import React, { Children, isValidElement } from 'react'
import { css } from '../../../styled-system/css'
import TabItem from './TabItem'
import type { TabItemProps } from './TabItem'

/**
 * Props for the Tab container component.
 */
interface TabProps<Tab extends string> {
  currentTab: Tab
  onTabChange: (value: Tab) => void
  children: React.ReactNode
  className?: string
}

/**
 * A container component that renders tabs and their content.
 */
const Tab = <Tab extends string>({ currentTab, onTabChange, children, className = '' }: TabProps<Tab>) => {
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
          {Children.map(children, child => {
            if (isValidElement<TabItemProps>(child) && child.type === TabItem) {
              const { children: _, ...props } = child.props
              return React.cloneElement(
                { ...child, props },
                {
                  active: child.props.value === currentTab,
                  onClick: () => onTabChange(child.props.value as Tab),
                },
              )
            }
            return child
          })}
        </div>
      </div>
      <div>
        {Children.map(children, child => {
          if (isValidElement<TabItemProps>(child) && child.type === TabItem && child.props.value === currentTab) {
            return child.props.children
          }
          return null
        })}
      </div>
    </div>
  )
}

export default Tab
