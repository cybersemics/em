import { CSSProperties } from 'react'
import getCommandState from './getCommandState'

type PlaceholderStyle = CSSProperties & {
  '--placeholder-background-color'?: string
  '--placeholder-color'?: string
  '--placeholder-font-family'?: string
  '--placeholder-font-style'?: string
  '--placeholder-font-weight'?: string
  '--placeholder-text-decoration'?: string
}

export interface ClearThoughtPlaceholderFormat {
  style: PlaceholderStyle
  backgroundColor?: true
  code?: true
  color?: true
  fontFamily?: true
  fontStyle?: true
  fontWeight?: true
  textDecoration?: true
}

/** Gets placeholder CSS variables and data flags for a cleared thought's whole-value formatting. */
const clearThoughtPlaceholderFormat = (value: string): ClearThoughtPlaceholderFormat | null => {
  const commandState = getCommandState(value)
  const style: PlaceholderStyle = {}
  const format: ClearThoughtPlaceholderFormat = { style }

  if (commandState.bold === true) {
    style['--placeholder-font-weight'] = '700'
    format.fontWeight = true
  }

  if (commandState.italic === true) {
    style['--placeholder-font-style'] = 'italic'
    format.fontStyle = true
  }

  const textDecoration = [
    commandState.underline === true ? 'underline' : null,
    commandState.strikethrough === true ? 'line-through' : null,
  ]
    .filter(Boolean)
    .join(' ')

  if (textDecoration) {
    style['--placeholder-text-decoration'] = textDecoration
    format.textDecoration = true
  }

  if (commandState.code === true) {
    style['--placeholder-font-family'] = 'monospace'
    format.fontFamily = true
    format.code = true
  }

  if (typeof commandState.foreColor === 'string') {
    style['--placeholder-color'] = commandState.foreColor
    format.color = true
  }

  if (typeof commandState.backColor === 'string') {
    style['--placeholder-background-color'] = commandState.backColor
    format.backgroundColor = true
  }

  return Object.keys(style).length > 0 ? format : null
}

export default clearThoughtPlaceholderFormat
