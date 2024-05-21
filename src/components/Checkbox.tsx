import React, { FC } from 'react'
import fastClick from '../util/fastClick'

/** A static checkbox component with em styling. */
const CheckboxInput = ({ checked }: { checked?: boolean }) => {
  return (
    <>
      {/* Ignore onChange and just use parent onClick, otherwise it triggers twice on desktop. It may be possible if the second onChange is prevented. readOnly is only set to avoid a React warning.
          Note: never preventDefault on a controlled checkbox onChange in React.
          See: https://stackoverflow.com/a/70030088/4806080 */}
      <input type='checkbox' checked={checked} readOnly />
      <span
        className='checkbox'
        // extend tap area without disrupting padding
        style={{ margin: 10, transform: 'translate(-10px, -10px)' }}
      />
    </>
  )
}

/** A checkbox item with a title and description. */
const Checkbox: FC<{
  checked?: boolean
  disabled?: boolean
  child?: boolean
  parent?: boolean
  onChange: (e: React.MouseEvent | React.TouchEvent | React.ChangeEvent) => void
  title?: string
  children?: React.ReactNode
}> = ({ checked, children, disabled, child, onChange, parent, title }) => {
  return (
    <label
      className='checkbox-container'
      style={{
        opacity: disabled ? 0.5 : undefined,
        marginBottom: children ? (parent ? '0.5em' : '1em') : 0,
        // child marginLeft should match .checkbox-container padding-left
        marginLeft: child ? '2.2em' : undefined,
        pointerEvents: disabled ? 'none' : undefined,
        cursor: disabled ? 'default' : 'pointer',
      }}
      // prevent the default click behavior, which autoscrolls in chrome if there is a checkbox within the label
      {...fastClick(e => {
        e.preventDefault()
        onChange(e)
      })}
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

      <CheckboxInput checked={checked} />
    </label>
  )
}

export default Checkbox
