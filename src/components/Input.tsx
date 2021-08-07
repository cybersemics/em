import React, { ChangeEvent, FC, useEffect, useState } from 'react'

export interface InputProps {
  type: string
  placeholder: string
  value: string
  key?: string
  onBlur?: (e: ChangeEvent<HTMLInputElement>) => void
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  onFocus?: (e: ChangeEvent<HTMLInputElement>) => void
}
/**
 * Input box component.
 */
const Input: FC<InputProps> = ({ key, type, value, placeholder, onBlur, onChange, onFocus }) => {
  const [inputValue, updateInputValue] = useState(value)

  useEffect(() => {
    updateInputValue(value)
  }, [value])

  /** On input change handler. */
  const onChangeHandler = (e: ChangeEvent<HTMLInputElement>) => updateInputValue(e.target.value)

  return (
    <input
      key={key}
      type={type}
      placeholder={placeholder}
      contentEditable={false}
      value={inputValue}
      onBlur={onBlur}
      onFocus={onFocus}
      onChange={onChangeHandler}
    />
  )
}

export default Input
