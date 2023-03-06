import React, { FC } from 'react'
import { isTouch } from '../browser'

/** A checkbox component with em styling. */
const Checkbox = ({ checked }: { checked?: boolean }) => {
  return (
    <>
      {/* Note: never preventDefault on a controlled checkbox in React.
          See: https://stackoverflow.com/a/70030088/4806080 */}
      <input type='checkbox' checked={checked} />
      <span
        className='checkbox'
        // extend tap area without disrupting padding
        style={{ margin: 10, transform: 'translate(-10px, -10px)' }}
      />
    </>
  )
}

/** A checkbox item with a title and description. */
const CheckboxItem: FC<{
  checked?: boolean
  disabled?: boolean
  child?: boolean
  parent?: boolean
  onChange: (e: React.MouseEvent | React.TouchEvent) => void
  title?: string
}> = ({ checked, children, disabled, child, onChange, parent, title }) => {
  return (
    <label
      className='checkbox-container'
      // checkbox onChange is very slow for some reason, so use onTouchStart on mobile
      onTouchStart={isTouch && !disabled ? onChange : undefined}
      onClick={!isTouch && !disabled ? onChange : undefined}
      style={{
        opacity: disabled ? 0.5 : undefined,
        marginBottom: children ? (parent ? '0.5em' : '1em') : 0,
        // child marginLeft should match .checkbox-container padding-left
        marginLeft: child ? '2.2em' : undefined,
        pointerEvents: disabled ? 'none' : undefined,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div
        style={{
          // Ensure that the title and description margins are not merged with checkbox-container margins.
          // For some reason they were preserved in Exports Advanced Settings but not User Settings.
          overflow: 'auto',
        }}
      >
        {title && (
          <div className='checkbox-label' style={{ lineHeight: children ? 1.2 : 1.5 }}>
            {title}
          </div>
        )}
        {children && <p className='checkbox-description text-medium dim'>{children}</p>}
      </div>

      <Checkbox checked={checked} />
    </label>
  )
}

export default CheckboxItem
