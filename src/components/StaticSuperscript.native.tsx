import React from 'react'
import { Text } from './Text.native'

/** Renders a given number as a superscript. */
const StaticSuperscript = ({ n }: { n: number }) => {
  return <Text>{n}</Text>
}

export default StaticSuperscript
