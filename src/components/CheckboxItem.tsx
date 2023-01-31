import React from 'react'

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
const CheckboxItem = ({
  checked,
  description,
  disable,
  indent,
  onChange,
  title,
}: {
  checked?: boolean
  description?: string
  disable?: boolean
  indent?: boolean
  onChange: React.ChangeEventHandler
  title?: string
}) => {
  return (
    <label
      className='checkbox-container'
      style={{
        opacity: disable ? 0.5 : undefined,
        // indent should match .checkbox-container padding-left
        marginLeft: indent ? '2.2em' : undefined,
        pointerEvents: disable ? 'none' : undefined,
      }}
    >
      <div>
        <p className='advance-setting-label'>{title}</p>
        <p className='advance-setting-description dim'>{description}</p>
      </div>

      <Checkbox checked={checked} onChange={onChange} />
    </label>
  )
}

export default CheckboxItem
