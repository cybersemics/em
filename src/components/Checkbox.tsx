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

export default Checkbox
