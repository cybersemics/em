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
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0',
          width: '100%',
          // height: '51px',
          borderBottom: '2px solid',
          borderColor: 'fgOverlay20',
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
