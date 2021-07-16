import React, { ChangeEvent, FC } from 'react'

interface InputProps {
  type: string
  placeholder: string
  value: string
  key?: string
  onBlur?: (e: ChangeEvent<HTMLInputElement>) => void
  onFocus: (e: ChangeEvent<HTMLInputElement>) => void
}
/**
 * Input box component.
 */
const Input: FC<InputProps> = ({ key, type, value, placeholder, onBlur, onFocus }) => (
  <input
    key={key}
    type={type}
    placeholder={placeholder}
    contentEditable={false}
    value={value}
    onBlur={onBlur}
    onFocus={onFocus}
  />
)

export default Input
