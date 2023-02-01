import React, { FC } from 'react'

/** A checkbox component with em styling. */
const Checkbox = ({
  checked,
  onChange,
}: {
  checked?: boolean
  onChange?: React.ChangeEventHandler<HTMLInputElement>
}) => {
  return (
    <>
      {/* Note: never preventDefault on a controlled checkbox in React.
          See: https://stackoverflow.com/a/70030088/4806080 */}
      <input type='checkbox' checked={checked} onChange={onChange} />
      <span className='checkbox' />
    </>
  )
}

/** A checkbox item with title and description. */
const CheckboxItem: FC<{
  checked?: boolean
  disabled?: boolean
  indent?: boolean
  onChange: React.ChangeEventHandler
  title?: string
}> = ({ checked, children, disabled, indent, onChange, title }) => {
  return (
    <label
      className='checkbox-container'
      style={{
        opacity: disabled ? 0.5 : undefined,
        // indent should match .checkbox-container padding-left
        marginLeft: indent ? '2.2em' : undefined,
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
        <p className='advance-setting-label'>{title}</p>
        <p className='advance-setting-description dim'>{children}</p>
      </div>

      <Checkbox checked={checked} onChange={onChange} />
    </label>
  )
}

export default CheckboxItem
