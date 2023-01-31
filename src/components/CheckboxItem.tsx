import React from 'react'
import Checkbox from './Checkbox'

/** A checkbox item with title and description. */
const CheckboxItem = ({
  checked,
  description,
  dim,
  indent,
  onChange,
  title,
}: {
  checked?: boolean
  description?: string
  dim?: boolean
  indent?: boolean
  onChange: React.ChangeEventHandler
  title?: string
}) => {
  return (
    <label
      className='checkbox-container'
      // marginLeft should match .checkbox-container paddingLeft
      style={{ opacity: dim ? 0.5 : undefined, marginLeft: indent ? 35 : undefined }}
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
